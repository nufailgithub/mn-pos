"use client";

import Image from "next/image";
import { useTheme } from "next-themes";
import { useState, useEffect } from "react";

import logoLightMode from "../assets/logo/logo-light.png";
import logoDarkMode from "../assets/logo/logo-dark.png";

export default function Logo() {
  const [mounted, setMounted] = useState(false);
  const { resolvedTheme } = useTheme();

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div 
        style={{ 
          width: 200, 
          height: 100, 
          display: 'inline-block' 
        }} 
        aria-hidden="true"
      />
    );
  }

  return (
    <Image
      src={resolvedTheme === "dark" ? logoDarkMode : logoLightMode}
      alt="Logo"
      width={200}
      height={100}
      priority
    />
  );
}