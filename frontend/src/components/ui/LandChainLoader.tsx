"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";

const MESSAGES = ["anchoring", "verifying", "securing"] as const;

/** Animated LandChain mark — chain links + parcel grid, blockchain pulse. */
export function LandChainLoader({ size = 88 }: { size?: number }) {
  const t = useTranslations("common.bootLoader");
  const [msgIndex, setMsgIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setMsgIndex((i) => (i + 1) % MESSAGES.length);
    }, 1400);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="flex flex-col items-center gap-6" role="status" aria-live="polite">
      <svg
        width={size}
        height={size}
        viewBox="0 0 88 88"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="landchain-loader-mark"
        aria-hidden
      >
        {/* Outer ring — blockchain anchor pulse */}
        <circle
          cx="44"
          cy="44"
          r="40"
          stroke="currentColor"
          strokeWidth="2"
          className="text-secondary/30"
        />
        <circle
          cx="44"
          cy="44"
          r="40"
          stroke="currentColor"
          strokeWidth="2"
          strokeDasharray="8 12"
          className="text-secondary animate-loader-spin-slow origin-center"
          style={{ transformOrigin: "44px 44px" }}
        />

        {/* Land parcel grid */}
        <rect x="22" y="28" width="44" height="32" rx="4" className="fill-primary/15 stroke-primary" strokeWidth="2" />
        <path d="M22 44h44M44 28v32M33 28v32M55 28v32" className="stroke-primary/40" strokeWidth="1.5" />

        {/* Chain links */}
        <ellipse cx="30" cy="68" rx="7" ry="4" className="stroke-secondary fill-secondary/20 animate-loader-pulse" strokeWidth="2" />
        <ellipse cx="44" cy="72" rx="7" ry="4" className="stroke-secondary fill-secondary/30 animate-loader-pulse-delay" strokeWidth="2" />
        <ellipse cx="58" cy="68" rx="7" ry="4" className="stroke-secondary fill-secondary/20 animate-loader-pulse" strokeWidth="2" />
        <path d="M37 68h6M51 70h6" className="stroke-secondary" strokeWidth="2" strokeLinecap="round" />

        {/* Center hash node */}
        <circle cx="44" cy="44" r="6" className="fill-secondary animate-loader-pulse" />
      </svg>

      <div className="text-center">
        <p className="text-sm font-bold tracking-wide text-primary">LandChain</p>
        <p className="mt-1 min-h-[1.25rem] text-xs text-text/60 transition-opacity duration-300">
          {t(MESSAGES[msgIndex])}
        </p>
      </div>
    </div>
  );
}
