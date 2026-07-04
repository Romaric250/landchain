"use client";

import { forwardRef } from "react";

/* Design-system primitives — themed exclusively via semantic tokens (§9.2). */

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "outline" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
};

const buttonVariants: Record<string, string> = {
  primary:
    "bg-primary text-background hover:opacity-90 disabled:opacity-50",
  secondary:
    "bg-secondary text-background hover:opacity-90 disabled:opacity-50",
  outline:
    "border border-primary/30 text-primary hover:bg-primary/5 disabled:opacity-50",
  ghost: "text-primary hover:bg-primary/5 disabled:opacity-50",
  danger: "bg-red-600 text-white hover:bg-red-700 disabled:opacity-50",
};

const buttonSizes: Record<string, string> = {
  sm: "px-3 py-1.5 text-sm",
  md: "px-4 py-2 text-sm",
  lg: "px-6 py-3 text-base",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  function Button({ variant = "primary", size = "md", className = "", ...props }, ref) {
    return (
      <button
        ref={ref}
        className={`inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors cursor-pointer disabled:cursor-not-allowed ${buttonVariants[variant]} ${buttonSizes[size]} ${className}`}
        {...props}
      />
    );
  },
);

type InputProps = React.InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  hint?: string;
};

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, hint, className = "", id, ...props },
  ref,
) {
  const inputId = id ?? props.name;
  return (
    <div className="flex flex-col gap-1.5 w-full">
      {label && (
        <label htmlFor={inputId} className="text-sm font-medium text-primary">
          {label}
        </label>
      )}
      <input
        ref={ref}
        id={inputId}
        className={`w-full rounded-lg border border-text/20 bg-background px-3 py-2 text-sm text-text placeholder:text-text/40 focus:border-secondary focus:outline-none focus:ring-1 focus:ring-secondary ${className}`}
        {...props}
      />
      {hint && <p className="text-xs text-text/60">{hint}</p>}
    </div>
  );
});

type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label?: string;
};

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  function Textarea({ label, className = "", id, ...props }, ref) {
    const inputId = id ?? props.name;
    return (
      <div className="flex flex-col gap-1.5 w-full">
        {label && (
          <label htmlFor={inputId} className="text-sm font-medium text-primary">
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          id={inputId}
          className={`w-full rounded-lg border border-text/20 bg-background px-3 py-2 text-sm text-text placeholder:text-text/40 focus:border-secondary focus:outline-none focus:ring-1 focus:ring-secondary min-h-28 ${className}`}
          {...props}
        />
      </div>
    );
  },
);

type SelectProps = React.SelectHTMLAttributes<HTMLSelectElement> & {
  label?: string;
};

export function Select({ label, className = "", id, children, ...props }: SelectProps) {
  const inputId = id ?? props.name;
  return (
    <div className="flex flex-col gap-1.5 w-full">
      {label && (
        <label htmlFor={inputId} className="text-sm font-medium text-primary">
          {label}
        </label>
      )}
      <select
        id={inputId}
        className={`w-full rounded-lg border border-text/20 bg-background px-3 py-2 text-sm text-text focus:border-secondary focus:outline-none ${className}`}
        {...props}
      >
        {children}
      </select>
    </div>
  );
}

export function Card({
  className = "",
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`rounded-xl border border-text/10 bg-background p-5 shadow-sm ${className}`}
      {...props}
    />
  );
}

const badgeColors: Record<string, string> = {
  green: "bg-green-100 text-green-800",
  red: "bg-red-100 text-red-800",
  yellow: "bg-yellow-100 text-yellow-800",
  gray: "bg-text/10 text-text",
  accent: "bg-accent text-primary",
  primary: "bg-primary text-background",
};

export function Badge({
  color = "gray",
  className = "",
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { color?: keyof typeof badgeColors }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${badgeColors[color]} ${className}`}
      {...props}
    />
  );
}

export function statusColor(status: string): keyof typeof badgeColors {
  switch (status) {
    case "active":
    case "verified":
    case "SUCCESSFUL":
    case "approved":
    case "completed":
    case "resolved":
    case "authentic":
      return "green";
    case "disputed":
    case "flagged":
    case "rejected":
    case "FAILED":
    case "suspended":
    case "fraudulent":
      return "red";
    case "pending":
    case "PENDING":
    case "under_review":
    case "open":
    case "suspicious":
    case "pending_verification":
      return "yellow";
    default:
      return "gray";
  }
}

export function Spinner({ className = "" }: { className?: string }) {
  return (
    <div
      role="status"
      aria-label="Loading"
      className={`h-5 w-5 animate-spin rounded-full border-2 border-text/20 border-t-secondary ${className}`}
    />
  );
}

export function Alert({
  tone = "info",
  children,
}: {
  tone?: "info" | "success" | "error" | "warning";
  children: React.ReactNode;
}) {
  const tones = {
    info: "bg-accent/50 text-primary border-accent",
    success: "bg-green-50 text-green-800 border-green-200",
    error: "bg-red-50 text-red-800 border-red-200",
    warning: "bg-yellow-50 text-yellow-800 border-yellow-200",
  };
  return (
    <div className={`rounded-lg border px-4 py-3 text-sm ${tones[tone]}`} role="alert">
      {children}
    </div>
  );
}

export function EmptyState({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-dashed border-text/20 p-10 text-center text-sm text-text/60">
      {children}
    </div>
  );
}

export function PageTitle({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="mb-6">
      <h1 className="text-2xl font-bold text-primary sm:text-3xl">{title}</h1>
      {subtitle && <p className="mt-1 text-sm text-text/70 sm:text-base">{subtitle}</p>}
    </div>
  );
}
