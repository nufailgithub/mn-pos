"use client";
import { ReactNode } from "react";
import Sidebar from "./Sidebar";
import Navbar from "./Navbar";
import { useBarcodeScanner } from "@/hooks/useBarcodeScanner";

export default function MainLayout({ children }: { children: ReactNode }) {
  // Enable global barcode scanner
  useBarcodeScanner();

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      
      {/* Main Content Area */}
      <div className="flex-1 flex flex-col lg:ml-64">
        <Navbar />
        
        {/* Page Content */}
        <main className="flex-1 overflow-y-auto bg-muted/30 p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
