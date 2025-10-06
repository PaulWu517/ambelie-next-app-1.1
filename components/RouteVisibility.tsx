"use client";

import React from 'react';
import { usePathname } from 'next/navigation';

export default function RouteVisibility({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const hide = pathname?.startsWith('/vr');
  if (hide) return null;
  return <>{children}</>;
}