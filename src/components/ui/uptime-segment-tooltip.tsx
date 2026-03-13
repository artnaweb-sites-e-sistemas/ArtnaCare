"use client"

import { useState, useRef, useEffect } from "react"
import { createPortal } from "react-dom"
import { cn } from "@/lib/utils"

interface UptimeSegmentTooltipProps {
  children: React.ReactNode
  content: React.ReactNode
  side?: "top" | "bottom"
  delay?: number
}

export function UptimeSegmentTooltip({
  children,
  content,
  side = "top",
  delay = 150,
}: UptimeSegmentTooltipProps) {
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState({ x: 0, y: 0 })
  const triggerRef = useRef<HTMLDivElement>(null)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const show = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    timeoutRef.current = setTimeout(() => {
      if (triggerRef.current) {
        const rect = triggerRef.current.getBoundingClientRect()
        setPos({
          x: rect.left + rect.width / 2,
          y: side === "top" ? rect.top - 8 : rect.bottom + 8,
        })
      }
      setOpen(true)
      timeoutRef.current = null
    }, delay)
  }

  const hide = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }
    // pequeno delay para permitir mover o mouse do segmento para o tooltip sem fechar
    timeoutRef.current = setTimeout(() => {
      setOpen(false)
      timeoutRef.current = null
    }, 120)
  }

  const transform = side === "top" ? "translate(-50%, -100%)" : "translate(-50%, 0)"

  useEffect(() => () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
  }, [])

  const tooltipEl = open && typeof document !== "undefined" && (
    <div
      className="pointer-events-auto fixed z-[100]"
      style={{
        left: pos.x,
        top: pos.y,
        transform,
      }}
      onMouseEnter={() => {
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current)
          timeoutRef.current = null
        }
      }}
      onMouseLeave={hide}
    >
      <div
        className={cn(
          "font-sans rounded-lg border border-border/50 bg-popover px-3 py-2 text-xs text-popover-foreground shadow-lg max-w-[260px]",
          "ring-1 ring-foreground/5"
        )}
      >
        {content}
      </div>
    </div>
  )

  return (
    <>
      <div
        ref={triggerRef}
        onMouseEnter={show}
        onMouseLeave={hide}
        className="min-w-0 min-h-full w-full flex cursor-pointer"
      >
        {children}
      </div>
      {open && typeof document !== "undefined" && createPortal(tooltipEl, document.body)}
    </>
  )
}
