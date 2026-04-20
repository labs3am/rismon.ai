"use client";

import * as React from "react";
import { X, Settings, Sparkles } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface UpgradeBannerProps {
  buttonText?: string;
  description?: string;
  onClose?: () => void;
  onClick?: () => void;
  className?: string;
  visible?: boolean;
}

export function UpgradeBanner({
  buttonText = "Upgrade to Pro",
  description = "for 2x more CPUs and faster builds",
  onClose,
  onClick,
  className,
  visible = true,
}: UpgradeBannerProps) {
  const [isHovered, setIsHovered] = React.useState(false);

  const iconVariants = {
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
        rotate: {
          duration: 1,
          type: "spring" as const,
          stiffness: 100,
          damping: 10,
        },
      },
    }),
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.25 }}
          className={cn(
            "flex items-center justify-center gap-3 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 backdrop-blur-md",
            className,
          )}
        >
          <div className="relative flex items-center justify-center">
            <Settings className="h-4 w-4 text-primary" strokeWidth={2.2} />
            <AnimatePresence>
              {isHovered && (
                <>
                  <motion.span
                    key="s1"
                    custom={{ x: -10, y: -10 }}
                    variants={iconVariants}
                    initial="hidden"
                    animate="visible"
                    exit="hidden"
                    className="absolute"
                  >
                    <Sparkles className="h-2.5 w-2.5 text-primary" />
                  </motion.span>
                  <motion.span
                    key="s2"
                    custom={{ x: 10, y: -8 }}
                    variants={iconVariants}
                    initial="hidden"
                    animate="visible"
                    exit="hidden"
                    className="absolute"
                  >
                    <Sparkles className="h-2 w-2 text-primary" />
                  </motion.span>
                  <motion.span
                    key="s3"
                    custom={{ x: 0, y: 12 }}
                    variants={iconVariants}
                    initial="hidden"
                    animate="visible"
                    exit="hidden"
                    className="absolute"
                  >
                    <Sparkles className="h-2 w-2 text-primary" />
                  </motion.span>
                </>
              )}
            </AnimatePresence>
          </div>

          <button
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            onClick={onClick}
            className="text-xs font-semibold text-foreground hover:text-primary transition-colors"
          >
            {buttonText}
          </button>
          <span className="text-xs text-muted-foreground hidden sm:inline">
            {description}
          </span>
          {onClose && (
            <button
              onClick={onClose}
              aria-label="Dismiss"
              className="ml-1 rounded-full p-0.5 text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
