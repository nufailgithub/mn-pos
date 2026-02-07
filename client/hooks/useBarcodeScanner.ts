"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { productsApi } from "@/lib/api/products";

/**
 * Global barcode scanner hook
 * Listens for barcode scanner input across the entire application
 * When a barcode is scanned and user is authenticated, navigates to new-bill
 * and opens the product dialog
 */
export function useBarcodeScanner() {
  const router = useRouter();
  const { status } = useSession();
  const barcodeBuffer = useRef("");
  const lastInputTime = useRef(0);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const handleKeyPress = async (e: KeyboardEvent) => {
      // Only process if user is authenticated
      if (status !== "authenticated") {
        return;
      }

      // Clear timeout if it exists
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      const currentTime = Date.now();
      const timeSinceLastInput = currentTime - lastInputTime.current;

      // If more than 100ms passed since last input, reset buffer
      // (barcode scanners input very quickly, typically < 50ms between characters)
      if (timeSinceLastInput > 100) {
        barcodeBuffer.current = "";
      }

      lastInputTime.current = currentTime;

      // Add character to buffer
      if (e.key.length === 1) {
        barcodeBuffer.current += e.key;
      } else if (e.key === "Enter" && barcodeBuffer.current.length > 0) {
        // Barcode scanner typically ends with Enter
        const scannedBarcode = barcodeBuffer.current.trim();
        barcodeBuffer.current = "";

        // Only process if barcode is reasonable length (barcode scanners usually scan 8+ characters)
        if (scannedBarcode.length >= 3) {
          try {
            // Fetch product by barcode
            const product = await productsApi.getByBarcode(scannedBarcode);
            
            // Navigate to new-bill with barcode parameter
            router.push(`/new-bill?barcode=${encodeURIComponent(scannedBarcode)}`);
            
            // Small delay to ensure navigation happens
            setTimeout(() => {
              // Trigger custom event to open product dialog
              globalThis.dispatchEvent(
                new CustomEvent("barcodeScanned", {
                  detail: { product, barcode: scannedBarcode },
                })
              );
            }, 100);
          } catch (error) {
            // Silently fail - product not found or other error
            // Don't show toast for every failed scan to avoid spam
            console.log("Barcode scan failed:", scannedBarcode);
          }
        }
      }

      // Clear buffer after 200ms of no input (in case Enter wasn't pressed)
      timeoutRef.current = setTimeout(() => {
        barcodeBuffer.current = "";
      }, 200);
    };

    window.addEventListener("keydown", handleKeyPress);

    return () => {
      window.removeEventListener("keydown", handleKeyPress);
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [router, status]);
}
