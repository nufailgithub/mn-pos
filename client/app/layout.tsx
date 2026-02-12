import type { Metadata } from "next";
import { Toaster } from "@/components/ui/sonner";

import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { QueryProvider } from "@/lib/query-client";
import { SessionProvider } from "@/components/session-provider";
import { PrinterProvider } from "@/components/PrinterProvider";

export const metadata: Metadata = {
  title: "MN Collection - POS System",
  description: "Point of Sale System for MN Collection",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-background text-foreground antialiased">
        <SessionProvider>
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            <QueryProvider>
              {/* PrinterProvider wraps everything so any page can call usePrinter() */}
              <PrinterProvider>
                {children}
                <Toaster closeButton position="top-center" />
              </PrinterProvider>
            </QueryProvider>
          </ThemeProvider>
        </SessionProvider>
      </body>
    </html>
  );
}