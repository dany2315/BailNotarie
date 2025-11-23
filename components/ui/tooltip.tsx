"use client"

import * as React from "react"
import * as TooltipPrimitive from "@radix-ui/react-tooltip"

import { cn } from "@/lib/utils"

// Contexte pour partager l'état mobile entre Tooltip et TooltipTrigger
const TooltipMobileContext = React.createContext<{
  isMobile: boolean
  open: boolean
  setOpen: (open: boolean) => void
} | null>(null)

function TooltipProvider({
  delayDuration = 0,
  ...props
}: React.ComponentProps<typeof TooltipPrimitive.Provider>) {
  return (
    <TooltipPrimitive.Provider
      data-slot="tooltip-provider"
      delayDuration={delayDuration}
      {...props}
    />
  )
}

// Hook pour détecter si on est sur mobile
function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState(false)

  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      const mediaQuery = window.matchMedia('(max-width: 1060px)')
      setIsMobile(mediaQuery.matches)

      const handleResize = () => setIsMobile(mediaQuery.matches)
      mediaQuery.addEventListener('change', handleResize)

      return () => {
        mediaQuery.removeEventListener('change', handleResize)
      }
    }
  }, [])

  return isMobile
}

function Tooltip({
  ...props
}: React.ComponentProps<typeof TooltipPrimitive.Root>) {
  const isMobile = useIsMobile()
  const [open, setOpen] = React.useState(false)

  // Sur mobile, utiliser un état contrôlé pour gérer l'ouverture au click
  // Sur desktop, laisser le comportement par défaut (hover)
  const tooltipProps = isMobile
    ? {
        ...props,
        open: open,
        onOpenChange: setOpen,
      }
    : props

  return (
    <TooltipProvider>
      <TooltipMobileContext.Provider value={{ isMobile, open, setOpen }}>
        <TooltipPrimitive.Root data-slot="tooltip" {...tooltipProps} />
      </TooltipMobileContext.Provider>
    </TooltipProvider>
  )
}

function TooltipTrigger({
  onClick,
  onPointerDown,
  ...props
}: React.ComponentProps<typeof TooltipPrimitive.Trigger>) {
  const context = React.useContext(TooltipMobileContext)
  const isMobile = context?.isMobile ?? false
  
  // Sur mobile, gérer le click pour ouvrir/fermer le tooltip
  const handleClick = React.useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    if (isMobile && context) {
      // Toggle l'état ouvert/fermé
      context.setOpen(!context.open)
    }
    onClick?.(e)
  }, [isMobile, context, onClick])

  const handlePointerDown = React.useCallback((e: React.PointerEvent<HTMLButtonElement>) => {
    if (isMobile && context) {
      // Toggle l'état ouvert/fermé
      context.setOpen(!context.open)
    }
    onPointerDown?.(e)
  }, [isMobile, context, onPointerDown])

  // Sur mobile, utiliser onClick et onPointerDown pour toggle
  // Sur desktop, laisser le comportement par défaut (hover)
  const triggerProps = isMobile
    ? {
        ...props,
        onClick: handleClick,
        onPointerDown: handlePointerDown,
      }
    : {
        ...props,
        onClick,
        onPointerDown,
      }

  return <TooltipPrimitive.Trigger data-slot="tooltip-trigger" {...triggerProps} />
}

function TooltipContent({
  className,
  sideOffset = 0,
  children,
  ...props
}: React.ComponentProps<typeof TooltipPrimitive.Content>) {
  return (
    <TooltipPrimitive.Portal>
      <TooltipPrimitive.Content
        data-slot="tooltip-content"
        sideOffset={sideOffset}
        className={cn(
          "bg-foreground text-background animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 z-50 w-fit origin-(--radix-tooltip-content-transform-origin) rounded-md px-3 py-1.5 text-xs text-balance",
          className
        )}
        {...props}
      >
        {children}
        <TooltipPrimitive.Arrow className="bg-foreground fill-foreground z-50 size-2.5 translate-y-[calc(-50%_-_2px)] rotate-45 rounded-[2px]" />
      </TooltipPrimitive.Content>
    </TooltipPrimitive.Portal>
  )
}

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider }
