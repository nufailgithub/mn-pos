"use client";

import { Button } from "@/components/ui/button";
import { Printer, Usb, Check, AlertCircle } from "lucide-react";
import { usePrinter } from "@/components/PrinterProvider";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function PrinterButton() {
  const { isConnected, isPrinting, printerType, connect, disconnect } = usePrinter();

  const handleConnect = async (type: "receipt" | "barcode" | "both") => {
    try {
      await connect(type);
    } catch (error) {
      console.error("Failed to connect printer:", error);
    }
  };

  if (!isConnected) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2">
            <Printer className="h-4 w-4" />
            <span className="hidden sm:inline">Connect Printer</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>Select Printer Type</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => handleConnect("receipt")}>
            <Printer className="h-4 w-4 mr-2" />
            Receipt Printer (XP-Q80AS)
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleConnect("barcode")}>
            <Usb className="h-4 w-4 mr-2" />
            Barcode Printer (XP-470B)
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleConnect("both")}>
            <Check className="h-4 w-4 mr-2" />
            Both (Auto-detect)
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="outline" 
          size="sm" 
          className="gap-2 border-green-600 text-green-600 hover:bg-green-50 dark:hover:bg-green-950"
        >
          <Check className="h-4 w-4" />
          <span className="hidden sm:inline">
            {isPrinting ? "Printing..." : "Printer Connected"}
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse" />
            <span>
              {printerType === "receipt" && "Receipt Printer"}
              {printerType === "barcode" && "Barcode Printer"}
              {printerType === "both" && "Both Printers"}
            </span>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={disconnect} className="text-destructive">
          <AlertCircle className="h-4 w-4 mr-2" />
          Disconnect Printer
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}