"use client";

import { usePathname } from "next/navigation";

interface HideOnRouteProps {
  paths: string[];
  children: React.ReactNode;
}

export function HideOnRoute({ paths, children }: HideOnRouteProps) {
  const pathname = usePathname();
  if (paths.some((p) => pathname === p || pathname.startsWith(p + "/"))) {
    return null;
  }
  return <>{children}</>;
}
