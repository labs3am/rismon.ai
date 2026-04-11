"use client"

import { useRef } from "react"
import { motion, useInView } from "framer-motion"
import { cn } from "@/lib/utils"

interface TimelineContentProps {
  children: React.ReactNode
  animationNum: number
  timelineRef: React.RefObject<HTMLElement | null>
  className?: string
}

export function TimelineContent({
  children,
  animationNum,
  timelineRef,
  className,
}: TimelineContentProps) {
  const isInView = useInView(timelineRef, { once: true, amount: 0.2 })

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, filter: "blur(10px)" }}
      animate={
        isInView
          ? { opacity: 1, y: 0, filter: "blur(0px)" }
          : { opacity: 0, y: 20, filter: "blur(10px)" }
      }
      transition={{
        delay: animationNum * 0.3,
        duration: 0.5,
        ease: "easeOut",
      }}
      className={cn(className)}
    >
      {children}
    </motion.div>
  )
}
