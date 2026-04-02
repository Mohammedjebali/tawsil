"use client";
import { useState, useEffect } from "react";
import SplashScreen from "@/components/SplashScreen";

export function AppWrapper({ children }: { children: React.ReactNode }) {
  const [showSplash, setShowSplash] = useState(false);

  useEffect(() => {
    const shown = sessionStorage.getItem("tawsil_splash");
    if (!shown) {
      setShowSplash(true);
    }
  }, []);

  const handleSplashDone = () => {
    sessionStorage.setItem("tawsil_splash", "1");
    setShowSplash(false);
  };

  return (
    <>
      {showSplash && <SplashScreen onDone={handleSplashDone} />}
      {children}
    </>
  );
}
