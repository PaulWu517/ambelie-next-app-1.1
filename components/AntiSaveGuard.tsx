"use client";

import { useEffect } from "react";

export default function AntiSaveGuard() {
  useEffect(() => {
    const isImg = (el: EventTarget | null) => {
      if (!(el instanceof HTMLElement)) return false;
      return el.tagName === "IMG" || !!el.closest("img");
    };

    const onContextMenu = (e: MouseEvent) => {
      if (isImg(e.target)) e.preventDefault();
    };

    const onDragStart = (e: DragEvent) => {
      if (isImg(e.target)) e.preventDefault();
    };

    const onKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      if ((e.ctrlKey || e.metaKey) && (key === "s" || key === "p")) {
        e.preventDefault();
      }
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (key === "i" || key === "c" || key === "j")) {
        e.preventDefault();
      }
    };

    const applyToImages = () => {
      document.querySelectorAll<HTMLImageElement>("img").forEach((img) => {
        if (img.getAttribute("draggable") !== "false") img.setAttribute("draggable", "false");
      });
    };

    const mo = new MutationObserver(() => applyToImages());

    document.addEventListener("contextmenu", onContextMenu, { capture: true });
    document.addEventListener("dragstart", onDragStart, { capture: true });
    document.addEventListener("keydown", onKeyDown, { capture: true });

    applyToImages();
    mo.observe(document.documentElement, { subtree: true, childList: true, attributes: true });

    return () => {
      document.removeEventListener("contextmenu", onContextMenu, { capture: true } as any);
      document.removeEventListener("dragstart", onDragStart, { capture: true } as any);
      document.removeEventListener("keydown", onKeyDown, { capture: true } as any);
      mo.disconnect();
    };
  }, []);

  return null;
}