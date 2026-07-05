"use client";

import { useEffect, useId, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";

export function DropdownMenu({
  trigger,
  children,
  align = "left",
  className = "",
}: {
  trigger: React.ReactNode;
  children: React.ReactNode;
  align?: "left" | "right";
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div ref={rootRef} className={`relative inline-flex ${className}`}>
      <div
        onClick={() => setOpen((v) => !v)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setOpen((v) => !v);
          }
        }}
        role="button"
        tabIndex={0}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-controls={menuId}
        className="cursor-pointer"
      >
        {trigger}
      </div>
      {open && (
        <div
          id={menuId}
          role="menu"
          className={`absolute top-full z-50 mt-1.5 min-w-[11rem] overflow-hidden rounded-xl border border-primary/10 bg-surface py-1 shadow-lg shadow-primary/10 ${
            align === "right" ? "right-0" : "left-0"
          }`}
          onClick={() => setOpen(false)}
        >
          {children}
        </div>
      )}
    </div>
  );
}

export function DropdownItem({
  children,
  onClick,
  href,
  className = "",
}: {
  children: React.ReactNode;
  onClick?: () => void;
  href?: string;
  className?: string;
}) {
  const base =
    "flex w-full items-center gap-2 px-3.5 py-2.5 text-left text-sm text-text/80 transition-colors hover:bg-accent/40 hover:text-primary cursor-pointer";

  if (href) {
    return (
      <a href={href} role="menuitem" className={`${base} ${className}`}>
        {children}
      </a>
    );
  }

  return (
    <button type="button" role="menuitem" onClick={onClick} className={`${base} ${className}`}>
      {children}
    </button>
  );
}

export function DropdownTriggerButton({
  label,
  className = "",
}: {
  label: string;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-lg border border-primary/15 bg-surface px-3 py-2 text-sm font-medium text-primary shadow-sm ${className}`}
    >
      {label}
      <ChevronDown className="h-4 w-4 text-text/50" strokeWidth={2} />
    </span>
  );
}
