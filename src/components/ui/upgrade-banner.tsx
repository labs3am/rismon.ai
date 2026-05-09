"use client";

import * as React from "react";
import { X } from "lucide-react";
import { motion, type Variants } from "framer-motion";
import { cn } from "@/lib/utils";

interface UpgradeBannerProps {
  buttonText?: string;
  description?: React.ReactNode;
  icon?: React.ReactNode;
  accent?: string; // hex
  onClose?: () => void;
  onClick?: () => void;
  className?: string;
}

const SettingsFilled = ({ className }: { className?: string }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="currentColor"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path d="M12 15.5A3.5 3.5 0 0 1 8.5 12 3.5 3.5 0 0 1 12 8.5a3.5 3.5 0 0 1 3.5 3.5 3.5 3.5 0 0 1-3.5 3.5m7.43-2.53c.04-.32.07-.64.07-.97 0-.33-.03-.66-.07-1l2.11-1.63c.19-.15.24-.42.12-.64l-2-3.46c-.12-.22-.39-.31-.61-.22l-2.49 1c-.52-.39-1.06-.73-1.69-.98l-.37-2.65A.506.506 0 0 0 14 2h-4c-.25 0-.46.18-.5.42l-.37 2.65c-.63.25-1.17.59-1.69.98l-2.49-1c-.22-.09-.49 0-.61.22l-2 3.46c-.13.22-.07.49.12.64L4.57 11c-.04.34-.07.67-.07 1 0 .33.03.65.07.97l-2.11 1.66c-.19.15-.25.42-.12.64l2 3.46c.12.22.39.3.61.22l2.49-1.01c.52.4 1.06.74 1.69.99l.37 2.65c.04.24.25.42.5.42h4c.25 0 .46-.18.5-.42l.37-2.65c.63-.26 1.17-.59 1.69-.99l2.49 1.01c.22.08.49 0 .61-.22l2-3.46c.12-.22.07-.49-.12-.64l-2.11-1.66Z" />
  </svg>
);

export function UpgradeBanner({
  buttonText = "Upgrade to Pro",
  description = "for 2x more CPUs and faster builds",
  icon,
  accent = "#f97316",
  onClose,
  onClick,
  className,
}: UpgradeBannerProps) {
  const [isHovered, setIsHovered] = React.useState(false);

  const iconVariants: Variants = {
    hidden: { x: 0, y: 0, opacity: 0, rotate: 0 },
    visible: (custom: { x: number; y: number }) => ({
      x: custom.x,
      y: custom.y,
      opacity: 1,
      rotate: 360,
      transition: {
        x: { duration: 0.3, ease: "easeOut" as const },
        y: { duration: 0.3, ease: "easeOut" as const },
        opacity: { duration: 0.3 },
        rotate: { duration: 1, type: "spring" as const, stiffness: 100, damping: 10 },
      },
    }),
  };

  return (
    <div
      className={cn(
        "relative w-full overflow-hidden rounded-full border px-3 py-1.5",
        className,
      )}
      style={{
        background: "#080808",
        borderColor: "#141414",
      }}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <button
            type="button"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            onClick={onClick}
            className="relative inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold transition-transform hover:scale-[1.02] flex-shrink-0"
            style={{
              background: accent,
              color: "#0a0a0a",
            }}
          >
            <span className="relative h-3.5 w-3.5">
              {icon ? (
                <span className="absolute inset-0 flex items-center justify-center">{icon}</span>
              ) : (
                <SettingsFilled className="absolute inset-0 h-3.5 w-3.5" />
              )}
              <motion.span
                className="absolute -left-0.5 -top-0.5 h-1 w-1 rounded-full"
                style={{ background: "#0a0a0a" }}
                variants={iconVariants}
                initial="hidden"
                animate={isHovered ? "visible" : "hidden"}
                custom={{ x: -4, y: -4 }}
              />
              <motion.span
                className="absolute -right-0.5 -bottom-0.5 h-1 w-1 rounded-full"
                style={{ background: "#0a0a0a" }}
                variants={iconVariants}
                initial="hidden"
                animate={isHovered ? "visible" : "hidden"}
                custom={{ x: 4, y: 4 }}
              />
            </span>
            <span className="whitespace-nowrap">{buttonText}</span>
          </button>
          <span
            className="text-xs truncate"
            style={{ color: "#a3a3a3", letterSpacing: "-0.005em" }}
          >
            {description}
          </span>
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Dismiss"
            className="flex-shrink-0 rounded-full p-1 transition-colors"
            style={{ color: "#666" }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = "#fff";
              e.currentTarget.style.background = "#0d0d0d";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = "#666";
              e.currentTarget.style.background = "transparent";
            }}
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}
