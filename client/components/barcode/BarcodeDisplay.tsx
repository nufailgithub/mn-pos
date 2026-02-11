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

export function BarcodeDisplay({
  barcode,
  productName,
  price = 0,
  open,
  onOpenChange,
  defaultQuantity = 1,
}: BarcodeDisplayProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [printQuantity, setPrintQuantity] = useState(defaultQuantity);

  // Format price to Sri Lankan Rupees
  const formatPrice = (amount: number) => {
    return new Intl.NumberFormat('si-LK', {
      style: 'currency',
      currency: 'LKR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount).replace('LKR', 'Rs.');
  };

  // Generate barcode for preview
  useEffect(() => {
    if (!open || !barcode || !svgRef.current) return;

    const timer = setTimeout(() => {
      try {
        while (svgRef.current?.firstChild) {
          svgRef.current.removeChild(svgRef.current.firstChild);
        }

        JsBarcode(svgRef.current!, barcode, {
          format: "CODE128",
          width: 1.8,
          height: 35,
          displayValue: false,
          margin: 0,
          lineColor: "#000000",
          background: "#ffffff",
        });

        const rects = svgRef.current?.querySelectorAll("rect");
        rects?.forEach((rect) => {
          const width = rect.getAttribute("width");
          if (width === "100%" || parseInt(width || "0") > 100) {
            rect.remove();
          }
        });

      } catch (error) {
        console.error("Error generating barcode:", error);
      }
    }, 150);

    return () => clearTimeout(timer);
  }, [open, barcode]);

  const generateBarcodeSVG = (code: string): string => {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    
    try {
      JsBarcode(svg, code, {
        format: "CODE128",
        width: 1.8,
        height: 35,
        displayValue: false,
        margin: 0,
        lineColor: "#000000",
        background: "#ffffff",
      });
      
      const rects = svg.querySelectorAll("rect");
      rects.forEach((rect) => {
        const width = rect.getAttribute("width");
        const x = rect.getAttribute("x") || "0";
        const y = rect.getAttribute("y") || "0";
        
        if (
          width === "100%" || 
          (parseInt(width || "0") > 100 && parseInt(x) === 0 && parseInt(y) === 0)
        ) {
          rect.remove();
        } else {
          rect.setAttribute("fill", "#000000");
          rect.setAttribute("stroke", "none");
        }
      });
      
      return svg.outerHTML;
    } catch (error) {
      console.error("Error generating barcode for print:", error);
      return "";
    }
  };

  const handlePrint = () => {
    const qty = Math.max(1, Math.min(printQuantity, 999));
    const printWindow = window.open("", "_blank");

    if (!printWindow) {
      alert("Please allow popups to print the barcode");
      return;
    }

    const barcodeSVG = generateBarcodeSVG(barcode);
    const formattedPrice = formatPrice(price);

    const singleLabel = `
      <div class="label">
        <div class="product-name">${productName}</div>
        <div class="barcode-wrapper">${barcodeSVG}</div>
        <div class="barcode-footer">
          <span class="barcode-number">${barcode}</span>
          <span class="barcode-price">${formattedPrice}</span>
        </div>
      </div>
    `;

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Print Barcode - Sri Lanka</title>
          <style>
            body {
              margin: 0;
              padding: 0;
              font-family: Arial, Helvetica, sans-serif;
              background: white;
            }

            .label {
              width: 40mm;
              height: 20mm;
              display: flex;
              flex-direction: column;
              page-break-after: always;
              box-sizing: border-box;
              padding: 1.5mm;
              background: white;
            }

            .product-name {
              font-size: 12px;
              font-weight: bold;
              width: 100%;
              white-space: nowrap;
              overflow: hidden;
              text-overflow: ellipsis;
              color: black;
              line-height: 1.2;
              height: 3.5mm;
              text-align: center;
              text-transform: uppercase;
              letter-spacing: 0.3px;
            }

            .barcode-wrapper {
              display: flex;
              justify-content: center;
              align-items: center;
              width: 100%;
              background: white;
              height: 10mm;
              margin: 0.2mm 0;
            }

            svg {
              width: 35mm;
              height: 10mm;
              display: block;
              background: white;
            }

            svg rect {
              fill: #000000 !important;
              stroke: none !important;
            }

            .barcode-footer {
              display: flex;
              justify-content: space-between;
              align-items: center;
              width: 100%;
              font-size: 7px;
              height: 3.5mm;
              line-height: 1;
            }

            .barcode-number {
              font-family: 'Courier New', monospace;
              color: black;
              font-weight: 600;
              letter-spacing: 0.5px;
            }

            .barcode-price {
              font-weight: bold;
              color: black;
              background: #e8e8e8;
              padding: 1px 3px;
              border-radius: 1px;
              font-size: 12px;
            }

            @page {
              size: 40mm 20mm;
              margin: 0;
            }

            @media print {
              * {
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
                color-adjust: exact;
              }
              
              html, body {
                margin: 0 !important;
                padding: 0 !important;
                background: white;
              }
              
              .label {
                page-break-after: always;
                background: white;
                border: none;
              }
              
              .barcode-price {
                background: #e8e8e8 !important;
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
              }
            }
          </style>
        </head>
        <body>
          ${new Array(qty).fill(singleLabel).join("")}
          <script>
            window.onload = function() {
              setTimeout(function() {
                window.print();
                window.onafterprint = function() {
                  window.close();
                };
              }, 300);
            };
          </script>
        </body>
      </html>
    `;

    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Product Barcode - Sri Lanka</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col items-center gap-4 py-4">
          {/* Preview card exactly 40x20mm scale */}
          <div 
            className="border rounded p-2 bg-white flex flex-col"
            style={{
              width: '80mm',
              height: '40mm',
              transform: 'scale(0.5)',
              transformOrigin: 'center'
            }}
          >
            <div className="text-xs font-bold truncate w-full uppercase">
              {productName}
            </div>
            <div className="flex justify-center items-center my-1">
              <svg ref={svgRef} style={{ width: '74mm', height: '22mm' }} />
            </div>
            <div className="flex justify-between items-center w-full text-[8px] mt-1">
              <span className="font-mono font-semibold">{barcode}</span>
              <span className="font-bold bg-gray-100 px-1 rounded">
                {formatPrice(price)}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full max-w-[200px] mt-4">
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