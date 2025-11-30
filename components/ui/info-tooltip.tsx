"use client"

import * as React from "react"
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip"
import { Popover, PopoverTrigger, PopoverContent, PopoverAnchor } from "@/components/ui/popover"
import useIsMobile from "@/hooks/useIsMobile"
import { cn } from "@/lib/utils"

interface InfoTooltipProps {
  children: React.ReactNode
  content: React.ReactNode
  className?: string
  sideOffset?: number
  align?: "start" | "center" | "end"
}

export function InfoTooltip({ 
  children, 
  content, 
  className,
  sideOffset = 4,
  align = "start"
}: InfoTooltipProps) {
  const isMobile = useIsMobile()

  if (isMobile) {
    return (
      <Popover>
        <PopoverTrigger asChild>
          {children}
        </PopoverTrigger>
        <PopoverContent 
          className={cn("w-auto max-w-xs p-3", className)}
          align={align}
          sideOffset={sideOffset}
        >
          {content}
        </PopoverContent>
      </Popover>
    )
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        {children}
      </TooltipTrigger>
      <TooltipContent 
        className={className}
        sideOffset={sideOffset}
      >
        {content}
      </TooltipContent>
    </Tooltip>
  )
}

