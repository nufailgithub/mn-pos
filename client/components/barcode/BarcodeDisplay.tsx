"use client";

import { useEffect, useRef, useState } from "react";
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
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Default quantity to print (e.g. product stock). Use 1 if not specified. */
  defaultQuantity?: number;
}

export function BarcodeDisplay({ barcode, productName, open, onOpenChange, defaultQuantity = 1 }: BarcodeDisplayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [printQuantity, setPrintQuantity] = useState(defaultQuantity);
  useEffect(() => {
    if (open && defaultQuantity >= 1) setPrintQuantity(defaultQuantity);
  }, [open, defaultQuantity]);

  useEffect(() => {
    if (open && barcode && canvasRef.current) {
      // Dynamically import jsbarcode only when needed
      import("jsbarcode")
        .then((JsBarcode) => {
          if (!canvasRef.current) return;
          try {
            // Set canvas size for proper barcode rendering
            canvasRef.current.width = 600;
            canvasRef.current.height = 200;
            
            // Generate visual barcode with bars/lines
            JsBarcode.default(canvasRef.current, barcode, {
              format: "CODE128", // Standard barcode format used in retail
              width: 2, // Width of each bar (thinner bars)
              height: 120, // Height of the bars (taller for better scanning)
              displayValue: true, // Show the barcode number below
              fontSize: 18,
              margin: 15,
              marginTop: 15,
              marginBottom: 15,
              marginLeft: 15,
              marginRight: 15,
              background: "#ffffff", // White background
              lineColor: "#000000", // Black bars
              textAlign: "center",
              textPosition: "bottom",
              textMargin: 8,
            });
          } catch (error) {
            console.error("Error generating barcode:", error);
            drawTextFallback();
          }
        })
        .catch((error) => {
          console.warn("jsbarcode library not installed. Please run: npm install jsbarcode @types/jsbarcode");
          console.error("Error loading jsbarcode:", error);
          // Fallback: display barcode as text if library fails
          drawTextFallback();
        });
    }

    function drawTextFallback() {
      if (canvasRef.current) {
        const ctx = canvasRef.current.getContext("2d");
        if (ctx) {
          canvasRef.current.width = 600;
          canvasRef.current.height = 200;
          ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
          ctx.fillStyle = "#000";
          ctx.font = "bold 24px monospace";
          ctx.textAlign = "center";
          ctx.fillText(barcode, canvasRef.current.width / 2, canvasRef.current.height / 2);
          ctx.font = "14px Arial";
          ctx.fillText("(Install jsbarcode for visual barcode)", canvasRef.current.width / 2, canvasRef.current.height / 2 + 30);
        }
      }
    }
  }, [open, barcode]);

  const handlePrint = () => {
    if (!canvasRef.current) return;
    const qty = Math.max(1, Math.min(printQuantity, 999));
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      alert("Please allow popups to print the barcode");
      return;
    }

    const imgData = canvasRef.current.toDataURL("image/png");
    const singleLabel = `
      <div class="barcode-container">
        <div class="product-name">${productName}</div>
        <img src="${imgData}" alt="Barcode" />
        <div class="barcode-value">${barcode}</div>
      </div>
    `;
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Barcode - ${productName} (${qty})</title>
          <style>
            body { margin: 0; padding: 20px; font-family: Arial, sans-serif; }
            .barcode-container {
              text-align: center;
              width: 100%;
              page-break-inside: avoid;
              margin-bottom: 20px;
              padding: 10px;
              border: 1px dashed #ccc;
            }
            .product-name { font-size: 16px; font-weight: bold; margin-bottom: 10px; }
            .barcode-value { font-size: 12px; margin-top: 8px; font-family: monospace; color: #666; }
            img {
              max-width: 100%;
              height: auto;
              image-rendering: -webkit-optimize-contrast;
              image-rendering: crisp-edges;
            }
            @page { margin: 10mm; size: A4; }
            @media print {
              body { margin: 0; padding: 0; }
              .barcode-container { border: none; margin-bottom: 8px; }
            }
          </style>
        </head>
        <body>
          ${new Array(qty).fill(singleLabel).join("")}
        </body>
      </html>
    `;

    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();

    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Product Barcode</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col items-center gap-4 py-4">
          <div className="text-sm font-medium">{productName}</div>
          <div className="border rounded p-4 bg-white">
            <canvas 
              ref={canvasRef} 
              className="max-w-full h-auto"
              style={{ imageRendering: "pixelated" }}
            />
          </div>
          <div className="text-xs text-muted-foreground font-mono">Barcode: {barcode}</div>
          <div className="flex items-center gap-2 w-full max-w-[200px]">
            <label htmlFor="barcode-qty" className="text-sm font-medium whitespace-nowrap">Print quantity</label>
            <Input
              id="barcode-qty"
              type="number"
              min={1}
              max={999}
              value={printQuantity}
              onChange={(e) => setPrintQuantity(Math.max(1, Math.min(999, Number(e.target.value) || 1)))}
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
