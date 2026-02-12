"use client";

import { useEffect, useRef, useState } from "react";
import JsBarcode from "jsbarcode";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Printer } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

interface BarcodeDisplayProps {
  barcode: string;
  productName: string;
  price?: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultQuantity?: number;
}

// Label physical dimensions (mm)
const LABEL_W_MM = 40;
const LABEL_H_MM = 20;

// Render at 300 DPI for thermal printer sharpness
// 1 inch = 25.4mm, so pixels = mm * (300/25.4)
const DPI = 300;
const MM_TO_PX = DPI / 25.4;

const LABEL_W_PX = Math.round(LABEL_W_MM * MM_TO_PX); // ~472px
const LABEL_H_PX = Math.round(LABEL_H_MM * MM_TO_PX); // ~236px

export function BarcodeDisplay({
  barcode,
  productName,
  price = 0,
  open,
  onOpenChange,
  defaultQuantity = 1,
}: BarcodeDisplayProps) {
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);
  const [printQuantity, setPrintQuantity] = useState(defaultQuantity);
  const [labelDataUrl, setLabelDataUrl] = useState<string>("");

  const formatPrice = (amount: number) => {
    return new Intl.NumberFormat("si-LK", {
      style: "currency",
      currency: "LKR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    })
      .format(amount)
      .replace("LKR", "Rs.");
  };

  /**
   * Core renderer: draws a full label onto a canvas at the given pixel size.
   * Using canvas avoids all SVG anti-aliasing and browser scaling artifacts.
   * The thermal printer receives a crisp 1-bit-style PNG with no blurry edges.
   */
  const renderLabelToCanvas = (
    canvas: HTMLCanvasElement,
    w: number,
    h: number
  ) => {
    const ctx = canvas.getContext("2d")!;
    canvas.width = w;
    canvas.height = h;

    // ── Background ──────────────────────────────────────────────────────────
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, w, h);

    // ── Product name ─────────────────────────────────────────────────────────
    const nameFontSize = Math.round(h * 0.13); // ~13% of label height
    ctx.fillStyle = "#000000";
    ctx.font = `bold ${nameFontSize}px Arial, Helvetica, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "top";

    // Truncate if too wide
    let displayName = productName.toUpperCase();
    const maxWidth = w * 0.92;
    while (
      ctx.measureText(displayName).width > maxWidth &&
      displayName.length > 1
    ) {
      displayName = displayName.slice(0, -1);
    }
    if (displayName !== productName.toUpperCase()) {
      displayName = displayName.slice(0, -1) + "…";
    }
    ctx.fillText(displayName, w / 2, Math.round(h * 0.03));

    // ── Barcode via JsBarcode → temp SVG → canvas ────────────────────────────
    // JsBarcode can render to a canvas element directly — this is the key fix.
    // Direct canvas rendering bypasses all SVG path rasterisation artifacts.
    const barcodeCanvas = document.createElement("canvas");
    const bcH = Math.round(h * 0.58);
    const bcW = Math.round(w * 0.92);

    try {
      JsBarcode(barcodeCanvas, barcode, {
        format: "CODE128",
        width: 3,          // bar width multiplier (integer = no fractional bars)
        height: bcH,
        displayValue: true,
        font: "Arial",
        fontSize: Math.round(h * 0.09),
        margin: 0,
        lineColor: "#000000",
        background: "#ffffff",
        textMargin: 2,
      });

      // Scale-fit the barcode canvas into the label, centred
      const bcActualW = barcodeCanvas.width;
      const bcActualH = barcodeCanvas.height;
      const scale = Math.min(bcW / bcActualW, bcH / bcActualH);
      const drawW = Math.round(bcActualW * scale);
      const drawH = Math.round(bcActualH * scale);
      const drawX = Math.round((w - drawW) / 2);
      const drawY = Math.round(h * 0.17);

      // Disable image smoothing → keeps bars sharp, no anti-aliasing blur
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(barcodeCanvas, drawX, drawY, drawW, drawH);
    } catch (err) {
      console.error("Barcode generation error:", err);
    }

    // ── Price badge ──────────────────────────────────────────────────────────
    const footerY = Math.round(h * 0.84);
    const priceFontSize = Math.round(h * 0.13);
    ctx.font = `bold ${priceFontSize}px Arial, Helvetica, sans-serif`;
    ctx.textAlign = "right";
    ctx.textBaseline = "top";

    const priceText = formatPrice(price);
    const priceMetrics = ctx.measureText(priceText);
    const badgePad = Math.round(w * 0.018);
    const badgeW = priceMetrics.width + badgePad * 2;
    const badgeH = priceFontSize + Math.round(h * 0.04);
    const badgeX = w - Math.round(w * 0.04) - badgeW;
    const badgeRadius = Math.round(h * 0.03);

    // Draw price background pill
    ctx.fillStyle = "#e8e8e8";
    ctx.beginPath();
    ctx.moveTo(badgeX + badgeRadius, footerY);
    ctx.lineTo(badgeX + badgeW - badgeRadius, footerY);
    ctx.quadraticCurveTo(badgeX + badgeW, footerY, badgeX + badgeW, footerY + badgeRadius);
    ctx.lineTo(badgeX + badgeW, footerY + badgeH - badgeRadius);
    ctx.quadraticCurveTo(badgeX + badgeW, footerY + badgeH, badgeX + badgeW - badgeRadius, footerY + badgeH);
    ctx.lineTo(badgeX + badgeRadius, footerY + badgeH);
    ctx.quadraticCurveTo(badgeX, footerY + badgeH, badgeX, footerY + badgeH - badgeRadius);
    ctx.lineTo(badgeX, footerY + badgeRadius);
    ctx.quadraticCurveTo(badgeX, footerY, badgeX + badgeRadius, footerY);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = "#000000";
    ctx.fillText(priceText, badgeX + badgeW - badgePad, footerY + Math.round(h * 0.02));
  };

  // ── Render preview canvas whenever dialog opens ──────────────────────────
  useEffect(() => {
    if (!open || !barcode) return;

    const timer = setTimeout(() => {
      // Preview canvas: display at 2× label size scaled by CSS (looks sharp on retina too)
      const PREVIEW_SCALE = 3;
      const pw = LABEL_W_PX * PREVIEW_SCALE;
      const ph = LABEL_H_PX * PREVIEW_SCALE;

      if (previewCanvasRef.current) {
        renderLabelToCanvas(previewCanvasRef.current, pw, ph);
      }

      // Also pre-render the full 300 DPI print version for instant printing
      const printCanvas = document.createElement("canvas");
      renderLabelToCanvas(printCanvas, LABEL_W_PX, LABEL_H_PX);
      setLabelDataUrl(printCanvas.toDataURL("image/png"));
    }, 100);

    return () => clearTimeout(timer);
  }, [open, barcode, productName, price]);

  // ── Print handler ─────────────────────────────────────────────────────────
  const handlePrint = () => {
    const qty = Math.max(1, Math.min(printQuantity, 999));
    const printWindow = window.open("", "_blank");

    if (!printWindow) {
      alert("Please allow popups to print the barcode");
      return;
    }

    if (!labelDataUrl) {
      alert("Label not ready yet, please try again.");
      return;
    }

    // Each label is a <img> sized exactly to the physical label dimensions.
    // Using a PNG image (not SVG) guarantees the thermal printer receives
    // raster data with no rasterisation step — bars stay crisp and scannable.
    const labelImg = `
      <div class="label">
        <img src="${labelDataUrl}" width="${LABEL_W_PX}" height="${LABEL_H_PX}" alt="barcode label" />
      </div>
    `;

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Print Barcode</title>
          <style>
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }

            html, body {
              background: white;
              width: ${LABEL_W_MM}mm;
            }

            /* Each label fills one physical page exactly */
            .label {
              width: ${LABEL_W_MM}mm;
              height: ${LABEL_H_MM}mm;
              overflow: hidden;
              page-break-after: always;
              display: flex;
              align-items: center;
              justify-content: center;
            }

            .label img {
              /* Force the image to the exact physical label size.
                 The PNG was rendered at 300 DPI so this 1:1 mapping 
                 means every pixel maps to 1/300 inch — crisp bars. */
              width: ${LABEL_W_MM}mm;
              height: ${LABEL_H_MM}mm;
              display: block;
              image-rendering: pixelated; /* no browser anti-aliasing */
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }

            @page {
              size: ${LABEL_W_MM}mm ${LABEL_H_MM}mm;
              margin: 0;
            }

            @media print {
              * {
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
              }
            }
          </style>
        </head>
        <body>
          ${new Array(qty).fill(labelImg).join("")}
          <script>
            window.onload = function () {
              // Small delay lets images fully decode before print dialog
              setTimeout(function () {
                window.print();
                window.onafterprint = function () { window.close(); };
              }, 400);
            };
          </script>
        </body>
      </html>
    `;

    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
  };

  // Preview canvas display size (CSS pixels, not physical)
  const previewDisplayW = LABEL_W_MM * 2.5; // ~100px wide preview
  const previewDisplayH = LABEL_H_MM * 2.5;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Product Barcode</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col items-center gap-4 py-4">
          {/* Preview — canvas element, displayed at CSS scale */}
          <div
            className="border rounded bg-white shadow-sm overflow-hidden"
            style={{ width: previewDisplayW, height: previewDisplayH }}
          >
            <canvas
              ref={previewCanvasRef}
              style={{
                width: previewDisplayW,
                height: previewDisplayH,
                display: "block",
                imageRendering: "pixelated",
              }}
            />
          </div>

          <p className="text-xs text-muted-foreground text-center">
            Rendered at 300 DPI for sharp thermal printing
          </p>

          <div className="flex items-center gap-2 w-full max-w-[200px]">
            <label className="text-sm font-medium whitespace-nowrap">
              Print quantity
            </label>
            <Input
              type="number"
              min={1}
              max={999}
              value={printQuantity}
              onChange={(e) =>
                setPrintQuantity(
                  Math.max(1, Math.min(999, Number(e.target.value) || 1))
                )
              }
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button onClick={handlePrint} className="gap-2">
            <Printer className="h-4 w-4" />
            Print {printQuantity} barcode{printQuantity !== 1 ? "s" : ""}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}