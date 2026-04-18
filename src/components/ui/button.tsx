import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium font-sans transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        // Primary: white bg, black text
        default: "bg-white text-black hover:bg-[#f0f0f0]",
        // Danger outline
        destructive: "bg-transparent border border-[#ef4444] text-[#ef4444] hover:bg-[rgba(239,68,68,0.08)]",
        // Secondary outline
        outline: "bg-transparent border border-[#333333] text-foreground hover:border-[#555555]",
        secondary: "bg-transparent border border-[#333333] text-foreground hover:border-[#555555]",
        // Ghost
        ghost: "bg-transparent text-foreground hover:bg-[#1a1a1a]",
        // Accent (use sparingly): orange outline
        link: "text-[#f97316] underline-offset-4 hover:underline",
        accent: "bg-transparent border border-[#f97316] text-[#f97316] hover:bg-[rgba(249,115,22,0.08)]",
      },
      size: {
        default: "h-10 px-[22px] py-[11px] rounded-md",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
