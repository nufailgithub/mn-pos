"use client";

import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
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
}

export function BarcodeDisplay({ barcode, productName, open, onOpenChange }: BarcodeDisplayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (open && barcode && canvasRef.current) {
      // Dynamically import jsbarcode only when needed
      import("jsbarcode")
        .then((JsBarcode) => {
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

    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      alert("Please allow popups to print the barcode");
      return;
    }

    const imgData = canvasRef.current.toDataURL("image/png");
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Barcode - ${productName}</title>
          <style>
            body {
              margin: 0;
              padding: 20px;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              font-family: Arial, sans-serif;
            }
            .barcode-container {
              text-align: center;
              width: 100%;
            }
            .product-name {
              font-size: 18px;
              font-weight: bold;
              margin-bottom: 15px;
            }
            .barcode-value {
              font-size: 14px;
              margin-top: 10px;
              font-family: monospace;
              color: #666;
            }
            img {
              max-width: 100%;
              height: auto;
              image-rendering: -webkit-optimize-contrast;
              image-rendering: crisp-edges;
            }
            @page {
              margin: 10mm;
              size: A4;
            }
            @media print {
              body {
                margin: 0;
                padding: 0;
              }
            }
          </style>
        </head>
        <body>
          <div class="barcode-container">
            <div class="product-name">${productName}</div>
            <img src="${imgData}" alt="Barcode" />
            <div class="barcode-value">${barcode}</div>
          </div>
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
              style={{ imageRendering: "pixelated" }} // Keep barcode crisp for printing
            />
          </div>
          <div className="text-xs text-muted-foreground font-mono">Barcode: {barcode}</div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button onClick={handlePrint} className="gap-2">
            <Printer className="h-4 w-4" />
            Print Barcode
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
