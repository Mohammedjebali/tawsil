"use client";

// AppWrapper no longer shows a splash — splash is handled in /app/page.tsx only
export function AppWrapper({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
