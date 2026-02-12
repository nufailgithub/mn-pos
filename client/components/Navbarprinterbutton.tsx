"use client";

import { usePrinter } from "@/components/PrinterProvider";
import { Printer, Usb, WifiOff, CheckCircle2, XCircle, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { 
  Tooltip, 
  TooltipContent, 
  TooltipProvider, 
  TooltipTrigger 
} from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";

export function PrinterButton() {
  const { 
    isConnected, 
    isConnecting, 
    isPrinting,
    lastError,
    connect, 
    disconnect,
    testPrint,
  } = usePrinter();

  const handleConnect = async () => {
    try {
      await connect();
      toast.success("Printer connected successfully!");
    } catch (err: any) {
      toast.error(err.message || "Failed to connect printer");
    }
  };

  const handleDisconnect = async () => {
    try {
      await disconnect();
      toast.info("Printer disconnected");
    } catch (err: any) {
      toast.error("Failed to disconnect printer");
    }
  };

  const handleTestPrint = async () => {
    try {
      await testPrint();
      toast.success("Test print sent!");
    } catch (err: any) {
      toast.error(err.message || "Test print failed");
    }
  };

  // Show error state
  if (lastError && !isConnected) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-2 text-destructive hover:text-destructive"
                >
                  <XCircle className="h-4 w-4" />
                  <span className="hidden sm:inline text-xs font-medium">Printer Error</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64">
                <DropdownMenuLabel>
                  <div className="flex items-center gap-2 text-destructive">
                    <XCircle className="h-4 w-4" />
                    <span>Connection Error</span>
                  </div>
                </DropdownMenuLabel>
                <div className="px-2 py-2 text-xs text-muted-foreground">
                  {lastError}
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleConnect}>
                  <Usb className="mr-2 h-4 w-4" />
                  Reconnect Printer
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            <div className="max-w-xs">
              <p className="font-semibold">Printer Error</p>
              <p className="text-xs">{lastError}</p>
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  // Connected state - show dropdown menu
  if (isConnected) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="gap-2 text-green-600 hover:text-green-700 hover:bg-green-50 dark:hover:bg-green-950"
          >
            {isPrinting ? (
              <>
                <Printer className="h-4 w-4 animate-pulse" />
                <span className="hidden sm:inline text-xs font-medium">Printing...</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4" />
                <span className="hidden sm:inline text-xs font-medium">Printer Ready</span>
              </>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>
            <div className="flex items-center gap-2 text-green-600">
              <Usb className="h-4 w-4" />
              <span>Printer Connected</span>
            </div>
          </DropdownMenuLabel>
          <div className="px-2 py-1 text-xs text-muted-foreground">
            XP-Q80AS via USB
          </div>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleTestPrint} disabled={isPrinting}>
            <Zap className="mr-2 h-4 w-4" />
            Test Print
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleDisconnect} className="text-destructive">
            <WifiOff className="mr-2 h-4 w-4" />
            Disconnect
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  // Disconnected state - simple connect button
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleConnect}
            disabled={isConnecting}
            className="gap-2 text-muted-foreground hover:text-foreground"
          >
            {isConnecting ? (
              <>
                <Printer className="h-4 w-4 animate-pulse" />
                <span className="hidden sm:inline text-xs">Connecting...</span>
              </>
            ) : (
              <>
                <WifiOff className="h-4 w-4" />
                <span className="hidden sm:inline text-xs">Connect Printer</span>
              </>
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom">
          Click to connect XP-Q80AS receipt printer via USB
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}