"use client";

/**
 * PrinterProvider.tsx
 * Place this in: @/components/PrinterProvider.tsx
 *
 * Global context for the Xprinter XP-Q80AS (80mm thermal receipt printer).
 * Uses Web USB API to send raw ESC/POS bytes — no driver scaling, no browser
 * print dialog weirdness. Works on macOS with Chrome or Edge.
 *
 * ONE-TIME SETUP ON MAC:
 *   1. Install Xprinter Mac driver from xprintertech.com
 *   2. Connect XP-Q80AS via USB
 *   3. Click "Connect Printer" button in the Navbar — browser shows USB picker
 *   4. Select your printer — permission is remembered by Chrome/Edge
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

// ─────────────────────────────────────────────────────────────────────────────
// ESC/POS command bytes
// ─────────────────────────────────────────────────────────────────────────────
const ESC = 0x1b;
const GS  = 0x1d;
const LF  = 0x0a;

const CMD = {
  INIT:           [ESC, 0x40],
  CUT_PARTIAL:    [GS,  0x56, 0x01],
  ALIGN_LEFT:     [ESC, 0x61, 0x00],
  ALIGN_CENTER:   [ESC, 0x61, 0x01],
  BOLD_ON:        [ESC, 0x45, 0x01],
  BOLD_OFF:       [ESC, 0x45, 0x00],
  DOUBLE_BOTH:    [ESC, 0x21, 0x30],   // double width + height
  DOUBLE_HEIGHT:  [ESC, 0x21, 0x10],
  NORMAL_SIZE:    [ESC, 0x21, 0x00],
  FEED_LINE:      [LF],
  FEED_4:         [ESC, 0x64, 4],
  CASH_DRAWER:    [ESC, 0x70, 0x00, 0x19, 0x78],
};

/**
 * Build ESC/POS GS ( k commands to print a native QR code.
 * The printer's own processor generates the QR — no image upload needed.
 * 
 * @param url     The URL/text to encode
 * @param size    Module size 1–8 (bigger = larger QR). 6 ≈ 35mm on 80mm paper
 */
function buildQRCodeCommands(url: string, size = 6): number[][] {
  const data    = Array.from(url).map(c => c.charCodeAt(0));
  const dataLen = data.length + 3; // +3 for pL, pH, cn, fn
  const pL      = dataLen & 0xff;
  const pH      = (dataLen >> 8) & 0xff;

  return [
    // 1. Model: QR Model 2
    [GS, 0x28, 0x6b, 0x04, 0x00, 0x31, 0x41, 0x32, 0x00],
    // 2. Size: module size (1–8)
    [GS, 0x28, 0x6b, 0x03, 0x00, 0x31, 0x43, size],
    // 3. Error correction: Level M (15%)
    [GS, 0x28, 0x6b, 0x03, 0x00, 0x31, 0x45, 0x31],
    // 4. Store data
    [GS, 0x28, 0x6b, pL, pH, 0x31, 0x50, 0x30, ...data],
    // 5. Print the stored QR
    [GS, 0x28, 0x6b, 0x03, 0x00, 0x31, 0x51, 0x30],
  ];
}

// 80mm paper at normal font = 48 chars per line
const COLS = 48;

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────
export interface ReceiptItem {
  name: string;
  qty: number;
  unitPrice: number;
  total: number;
  size?: string;
  discount?: number;
  discountType?: "PERCENTAGE" | "AMOUNT";
}

export interface ReceiptData {
  saleNumber: string;
  date: string;
  cashier?: string;
  customerName?: string;
  customerPhone?: string;
  items: ReceiptItem[];
  subtotal: number;
  discount?: number;
  total: number;
  payments: { method: string; amount: number; reference?: string }[];
  totalPaid: number;
  balance?: number;    // credit balance owed
  change?: number;     // change to give back
  notes?: string;
  openCashDrawer?: boolean;
}

interface PrinterContextValue {
  isConnected: boolean;
  isConnecting: boolean;
  isPrinting: boolean;
  lastError: string | null;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  print: (data: ReceiptData) => Promise<void>;
  testPrint: () => Promise<void>;
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────
function encodeText(text: string): number[] {
  const bytes: number[] = [];
  for (let i = 0; i < text.length; i++) {
    const c = text.charCodeAt(i);
    bytes.push(c < 256 ? c : 0x3f);
  }
  return bytes;
}

function col(text: string, width: number, align: "left" | "right" | "center" = "left"): string {
  const s = String(text);
  if (s.length >= width) return s.slice(0, width);
  const pad = width - s.length;
  if (align === "right")  return " ".repeat(pad) + s;
  if (align === "center") return " ".repeat(Math.floor(pad / 2)) + s + " ".repeat(Math.ceil(pad / 2));
  return s + " ".repeat(pad);
}

function twoCol(left: string, right: string, total = COLS): string {
  const rw = right.length;
  return col(left, total - rw - 1) + " " + col(right, rw, "right");
}

function divider(char = "-", width = COLS): string {
  return char.repeat(width);
}

function fmt(n: number): string {
  return "Rs." + n.toLocaleString("en-LK", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// ─────────────────────────────────────────────────────────────────────────────
// Build ESC/POS buffer
// ─────────────────────────────────────────────────────────────────────────────
function buildReceiptBuffer(data: ReceiptData): Uint8Array {
  const chunks: number[][] = [];
  const push = (...cmds: number[][]) => cmds.forEach(c => chunks.push(c));
  const text = (s: string) => chunks.push(encodeText(s));
  const line = (s = "") => { text(s); push(CMD.FEED_LINE); };

  push(CMD.INIT);
  if (data.openCashDrawer) push(CMD.CASH_DRAWER);

  // ── Shop header ───────────────────────────────────────────────────────────
  push(CMD.ALIGN_CENTER, CMD.BOLD_ON);
  // Triple size for extra bold header
  push([ESC, 0x21, 0x38]); // width x3 + height x3
  line("M|N COLLECTION");
  push(CMD.NORMAL_SIZE, CMD.BOLD_OFF);
  line("WHERE VALUE MEETS QUALITY");
  line("168/C, Fatha Hajiar Mawatha,");
  line("Dharga Town");
  line("Tel: 0783714171 / 0774684087");

  push(CMD.ALIGN_LEFT);
  line(divider("="));

  // ── Meta ─────────────────────────────────────────────────────────────────
  line(twoCol("Bill: " + data.saleNumber, data.date));
  if (data.cashier)      line("Cashier: " + data.cashier);
  if (data.customerName) line("Customer: " + data.customerName);
  if (data.customerPhone) line("Phone: " + data.customerPhone);
  line(divider());

  // ── Column headers ────────────────────────────────────────────────────────
  push(CMD.BOLD_ON);
  // Layout: ITEM(21) QTY(4) PRICE(10) TOTAL(12) = 47 chars + 3 spaces = 50 total
  line(col("ITEM", 21) + " " + col("QTY", 4, "right") + " " + col("PRICE", 9, "right") + " " + col("TOTAL", 11, "right"));
  push(CMD.BOLD_OFF);
  line(divider());

  // ── Items ─────────────────────────────────────────────────────────────────
  for (const item of data.items) {
    const label = item.name + (item.size ? ` (${item.size})` : "");
    const maxLen = 21;

    // Wrap long names
    const nameLines: string[] = [];
    let remaining = label;
    while (remaining.length > maxLen) {
      const cut = remaining.lastIndexOf(" ", maxLen);
      const at  = cut > 0 ? cut : maxLen;
      nameLines.push(remaining.slice(0, at));
      remaining = remaining.slice(at).trim();
    }
    nameLines.push(remaining);

    // First line with numbers
    line(
      col(nameLines[0], 21) + " " +
      col(String(item.qty), 4, "right") + " " +
      col(fmt(item.unitPrice), 9, "right") + " " +
      col(fmt(item.total), 11, "right")
    );

    // Overflow name lines
    for (let i = 1; i < nameLines.length; i++) {
      line("  " + nameLines[i]);
    }

    // Inline discount
    if (item.discount && item.discount > 0) {
      const discText = item.discountType === "PERCENTAGE"
        ? `Disc: ${item.discount}%`
        : `Disc: -${fmt(item.discount)}`;
      line("  " + discText);
    }
  }

  line(divider());

  // ── Totals ────────────────────────────────────────────────────────────────
  if (data.discount && data.discount > 0) {
    line(twoCol("Subtotal:", fmt(data.subtotal)));
    line(twoCol("Discount:", "-" + fmt(data.discount)));
  }

  push(CMD.BOLD_ON, CMD.DOUBLE_HEIGHT);
  line(twoCol("TOTAL:", fmt(data.total)));
  push(CMD.NORMAL_SIZE, CMD.BOLD_OFF);

  line(divider("-"));

  // Payments breakdown
  for (const p of data.payments) {
    line(twoCol(p.method + (p.reference ? ` (${p.reference})` : ""), fmt(p.amount)));
  }
  line(twoCol("Total Paid:", fmt(data.totalPaid)));

  if (data.balance && data.balance > 0) {
    push(CMD.BOLD_ON);
    line(twoCol("Credit Balance:", fmt(data.balance)));
    push(CMD.BOLD_OFF);
  }
  if (data.change && data.change > 0) {
    push(CMD.BOLD_ON);
    line(twoCol("Change:", fmt(data.change)));
    push(CMD.BOLD_OFF);
  }

  line(divider("="));

  // ── Footer + WhatsApp QR code ─────────────────────────────────────────────
  push(CMD.ALIGN_CENTER);
  line("Thank you for shopping with us!");
  line("We truly appreciate your trust.");
  push(CMD.FEED_LINE);
  line("Scan to join our WhatsApp:");
  push(CMD.FEED_LINE);
  // Native QR — printer renders it directly, no image upload needed.
  // size=6 produces ~35mm QR, easy to scan on an 80mm receipt.
  push(...buildQRCodeCommands("https://chat.whatsapp.com/Eu3HUPRtS24LHtytOz9ziP", 6));
  push(CMD.FEED_4, CMD.CUT_PARTIAL);

  const flat: number[] = [];
  chunks.forEach(c => c.forEach(b => flat.push(b)));
  return new Uint8Array(flat);
}

// ─────────────────────────────────────────────────────────────────────────────
// USB state management
// ─────────────────────────────────────────────────────────────────────────────
class USBPrinterManager {
  private device: USBDevice | null = null;
  private endpoint = 1;
  private isInitialized = false;

  async connect(): Promise<boolean> {
    if (typeof navigator === "undefined" || !navigator.usb) {
      throw new Error("Web USB API not supported in this browser");
    }

    try {
      // Request device from user
      const device = await navigator.usb.requestDevice({ filters: [] });
      await this.initializeDevice(device);
      this.isInitialized = true;
      return true;
    } catch (err: any) {
      if (err.name === "NotFoundError") {
        // User cancelled the picker
        return false;
      }
      throw new Error(`Failed to connect: ${err.message}`);
    }
  }

  async reconnect(): Promise<boolean> {
    if (typeof navigator === "undefined" || !navigator.usb) {
      return false;
    }

    try {
      const devices = await navigator.usb.getDevices();
      if (devices.length === 0) {
        this.isInitialized = false;
        return false;
      }

      await this.initializeDevice(devices[0]);
      this.isInitialized = true;
      return true;
    } catch (err) {
      console.error("Reconnect failed:", err);
      this.isInitialized = false;
      return false;
    }
  }

  private async initializeDevice(device: USBDevice): Promise<void> {
    try {
      // Close if already open
      if (device.opened) {
        try {
          await device.close();
        } catch (e) {
          // Ignore close errors
        }
      }

      await device.open();
      
      // Select configuration if needed
      if (device.configuration === null) {
        await device.selectConfiguration(1);
      }

      // Claim interface
      const iface = device.configuration!.interfaces[0];
      await device.claimInterface(iface.interfaceNumber);

      // Find bulk OUT endpoint
      const outEp = iface.alternates[0].endpoints.find(
        ep => ep.direction === "out" && ep.type === "bulk"
      );

      if (!outEp) {
        throw new Error("No bulk OUT endpoint found on printer");
      }

      this.endpoint = outEp.endpointNumber;
      this.device = device;
    } catch (err: any) {
      this.device = null;
      throw new Error(`Device initialization failed: ${err.message}`);
    }
  }

  async disconnect(): Promise<void> {
    if (this.device && this.device.opened) {
      try {
        await this.device.close();
      } catch (err) {
        console.error("Error closing device:", err);
      }
    }
    this.device = null;
    this.isInitialized = false;
  }

  async send(buffer: Uint8Array): Promise<void> {
    if (!this.device) {
      throw new Error("Printer not connected");
    }

    try {
      // Ensure device is ready
      if (!this.device.opened) {
        await this.initializeDevice(this.device);
      }

      // Send in chunks (USB has size limits)
      const CHUNK_SIZE = 64;
      for (let offset = 0; offset < buffer.length; offset += CHUNK_SIZE) {
        const chunk = buffer.slice(offset, offset + CHUNK_SIZE);
        await this.device.transferOut(this.endpoint, chunk);
      }
    } catch (err: any) {
      // If send fails, mark as not initialized
      this.isInitialized = false;
      throw new Error(`Print failed: ${err.message}`);
    }
  }

  isReady(): boolean {
    return this.isInitialized && this.device !== null;
  }
}

// Single instance
const printerManager = new USBPrinterManager();

// ─────────────────────────────────────────────────────────────────────────────
// Context
// ─────────────────────────────────────────────────────────────────────────────
const PrinterContext = createContext<PrinterContextValue | null>(null);

export function usePrinter() {
  const ctx = useContext(PrinterContext);
  if (!ctx) throw new Error("usePrinter must be used inside <PrinterProvider>");
  return ctx;
}

export function PrinterProvider({ children }: { children: React.ReactNode }) {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);

  // Check for previously authorized devices on mount
  useEffect(() => {
    if (typeof navigator === "undefined" || !navigator.usb) return;

    const checkExisting = async () => {
      const reconnected = await printerManager.reconnect();
      setIsConnected(reconnected);
    };

    checkExisting();

    // Listen for disconnect events
    const handleDisconnect = () => {
      setIsConnected(false);
      setLastError("Printer disconnected");
    };

    navigator.usb.addEventListener("disconnect", handleDisconnect);
    return () => navigator.usb.removeEventListener("disconnect", handleDisconnect);
  }, []);

  const connect = useCallback(async () => {
    setIsConnecting(true);
    setLastError(null);
    try {
      const success = await printerManager.connect();
      setIsConnected(success);
      if (!success) {
        setLastError("No printer selected");
      }
    } catch (err: any) {
      setLastError(err.message);
      setIsConnected(false);
      throw err;
    } finally {
      setIsConnecting(false);
    }
  }, []);

  const disconnect = useCallback(async () => {
    setLastError(null);
    try {
      await printerManager.disconnect();
      setIsConnected(false);
    } catch (err: any) {
      setLastError(err.message);
    }
  }, []);

  const testPrint = useCallback(async () => {
    setIsPrinting(true);
    setLastError(null);
    try {
      const testBuffer = new Uint8Array([
        ...CMD.INIT,
        ...CMD.ALIGN_CENTER,
        ...CMD.BOLD_ON,
        ...encodeText("TEST PRINT"),
        ...CMD.FEED_LINE,
        ...CMD.BOLD_OFF,
        ...encodeText("Printer is working!"),
        ...CMD.FEED_LINE,
        ...CMD.FEED_LINE,
        ...CMD.FEED_LINE,
        ...CMD.CUT_PARTIAL,
      ]);
      await printerManager.send(testBuffer);
    } catch (err: any) {
      setLastError(err.message);
      setIsConnected(false);
      throw err;
    } finally {
      setIsPrinting(false);
    }
  }, []);

  const print = useCallback(async (data: ReceiptData) => {
    setIsPrinting(true);
    setLastError(null);
    try {
      const buffer = buildReceiptBuffer(data);
      await printerManager.send(buffer);
    } catch (err: any) {
      console.error("Print error:", err);
      setLastError(err.message);
      setIsConnected(false);
      
      // Fall back to browser print
      console.warn("Falling back to browser print dialog");
      printFallback(data);
    } finally {
      setIsPrinting(false);
    }
  }, []);

  return (
    <PrinterContext.Provider 
      value={{ 
        isConnected, 
        isConnecting, 
        isPrinting, 
        lastError,
        connect, 
        disconnect,
        print,
        testPrint,
      }}
    >
      {children}
    </PrinterContext.Provider>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// HTML fallback (used if USB not connected / not supported)
// ─────────────────────────────────────────────────────────────────────────────
function printFallback(data: ReceiptData) {
  const win = window.open("", "_blank");
  if (!win) { alert("Allow popups to print"); return; }

  const rows = data.items.map(item => {
    const label = item.name + (item.size ? ` (${item.size})` : "");
    const discText = item.discount && item.discount > 0
      ? (item.discountType === "PERCENTAGE" ? `${item.discount}%` : `Rs. ${item.discount.toLocaleString()}`)
      : "";
    return `<tr>
      <td class="name">${label}</td>
      <td class="num">${item.qty}</td>
      <td class="num">Rs. ${item.unitPrice.toLocaleString()}</td>
      <td class="num">${discText}</td>
      <td class="num">Rs. ${item.total.toLocaleString()}</td>
    </tr>`;
  }).join("");

  const paymentsHtml = data.payments.map(p => `
    <div class="row sm"><span>${p.method}${p.reference ? ` (${p.reference})` : ""}:</span><span>Rs. ${p.amount.toLocaleString()}</span></div>
  `).join("");

  win.document.write(`<!DOCTYPE html><html><head><title>Receipt - ${data.saleNumber}</title>
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{font-family:'Courier New',monospace;font-size:12px;width:80mm;padding:4mm;background:white;color:black}
    .center{text-align:center}.bold{font-weight:bold}
    h1{font-size:20px;font-weight:bold;text-align:center}
    .sub{font-size:9px;text-transform:uppercase;letter-spacing:.1em;text-align:center}
    .addr{font-size:10px;text-align:center;margin:2px 0}
    .dash{border-top:1px dashed #000;margin:4px 0}
    .solid{border-top:1px solid #000;margin:4px 0}
    .row{display:flex;justify-content:space-between;margin:2px 0;font-size:11px}
    .row.sm{font-size:10px;color:#444}
    .row.big{font-size:15px;font-weight:bold;margin:4px 0}
    .row.red{color:red;font-weight:bold}
    .row.green{color:green;font-weight:bold}
    table{width:100%;border-collapse:collapse;font-size:10px;margin:4px 0}
    th,td{padding:2px 1px}
    th{border-bottom:1px solid #000;text-align:left;font-size:10px}
    .num{text-align:right}.name{word-break:break-word;max-width:28mm}
    .total-bold{font-size:13px;font-weight:bold;padding-top:3px}
    @page{size:80mm auto;margin:0}
    @media print{*{-webkit-print-color-adjust:exact;print-color-adjust:exact}}
  </style></head><body>
  <h1>M|N COLLECTION</h1>
  <div class="sub">WHERE VALUE MEETS QUALITY</div>
  <div class="addr">168/C, Fatha Hajiar Mawatha, Dharga Town</div>
  <div class="addr">Tel: 0783714171 / 0774684087</div>
  <div class="dash"></div>
  <div class="row"><span>Bill: ${data.saleNumber}</span><span>${data.date}</span></div>
  ${data.cashier      ? `<div class="row sm"><span>Cashier:</span><span>${data.cashier}</span></div>` : ""}
  ${data.customerName ? `<div class="row sm"><span>Customer:</span><span>${data.customerName}</span></div>` : ""}
  ${data.customerPhone? `<div class="row sm"><span>Phone:</span><span>${data.customerPhone}</span></div>` : ""}
  <div class="dash"></div>
  <table>
    <thead><tr>
      <th>Item</th><th class="num">Qty</th><th class="num">Price</th><th class="num">Disc</th><th class="num">Total</th>
    </tr></thead>
    <tbody>${rows}</tbody>
  </table>
  <div class="dash"></div>
  ${data.discount && data.discount > 0 ? `
    <div class="row"><span>Subtotal:</span><span>Rs. ${data.subtotal.toLocaleString()}</span></div>
    <div class="row" style="color:green"><span>Discount:</span><span>-Rs. ${data.discount.toLocaleString()}</span></div>
  ` : ""}
  <div class="solid"></div>
  <div class="row big"><span>TOTAL:</span><span>Rs. ${data.total.toLocaleString()}</span></div>
  <div class="dash"></div>
  ${paymentsHtml}
  <div class="row"><span>Total Paid:</span><span>Rs. ${data.totalPaid.toLocaleString()}</span></div>
  ${data.balance && data.balance > 0 ? `<div class="row red"><span>Credit Balance:</span><span>Rs. ${data.balance.toLocaleString()}</span></div>` : ""}
  ${data.change  && data.change  > 0 ? `<div class="row green"><span>Change:</span><span>Rs. ${data.change.toLocaleString()}</span></div>` : ""}
  <div class="solid"></div>
  <div class="center" style="margin-top:8px;font-size:11px">
    Thank you for shopping with us!<br/>We truly appreciate your trust.
  </div>
  <div class="center" style="margin-top:8px;font-size:10px">
    Scan to join our WhatsApp:
  </div>
  <div class="center" style="margin-top:4px">
    <img 
      src="https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=https%3A%2F%2Fchat.whatsapp.com%2FEu3HUPRtS24LHtytOz9ziP" 
      alt="WhatsApp QR"
      style="width:30mm;height:30mm;display:inline-block"
    />
  </div>
  <br/><br/><br/>
  <script>window.onload=()=>setTimeout(()=>{window.print();window.onafterprint=()=>window.close();},300)</script>
  </body></html>`);
  win.document.close();
}