import * as React from "react"
import * as PopoverPrimitive from "@radix-ui/react-popover"

import { cn } from "@/lib/utils"

const Popover = PopoverPrimitive.Root

const PopoverTrigger = PopoverPrimitive.Trigger

const PopoverAnchor = PopoverPrimitive.Anchor

const PopoverContent = React.forwardRef(({ 
  className, 
  align = "center", 
  sideOffset = 8,
  showArrow = false,
  ...props 
}, ref) => (
  <PopoverPrimitive.Portal>
    <PopoverPrimitive.Content
      ref={ref}
      align={align}
      sideOffset={sideOffset}
      className={cn(
        "z-50 w-72 rounded-lg border border-border/50 bg-popover p-4 text-popover-foreground shadow-xl shadow-black/20 outline-none",
        "data-[state=open]:animate-in data-[state=closed]:animate-out",
        "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
        "data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
        "data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2",
        "data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
        className
      )}
      {...props}
    >
      {props.children}
      {showArrow && (
        <PopoverPrimitive.Arrow 
          className="fill-popover drop-shadow-sm" 
          width={12} 
          height={6} 
        />
      )}
    </PopoverPrimitive.Content>
  </PopoverPrimitive.Portal>
))
PopoverContent.displayName = PopoverPrimitive.Content.displayName

const PopoverHeader = React.forwardRef(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex items-center justify-between pb-2 mb-2 border-b border-border/50", className)}
    {...props}
  />
))
PopoverHeader.displayName = "PopoverHeader"

const PopoverTitle = React.forwardRef(({ className, ...props }, ref) => (
  <h4
    ref={ref}
    className={cn("font-semibold text-sm leading-none", className)}
    {...props}
  />
))
PopoverTitle.displayName = "PopoverTitle"

const PopoverDescription = React.forwardRef(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
  />
))
PopoverDescription.displayName = "PopoverDescription"

const PopoverClose = React.forwardRef(({ className, ...props }, ref) => (
  <PopoverPrimitive.Close
    ref={ref}
    className={cn(
      "absolute right-2 top-2 rounded-sm opacity-70 ring-offset-background transition-opacity",
      "hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
      "disabled:pointer-events-none",
      className
    )}
    {...props}
  />
))
PopoverClose.displayName = PopoverPrimitive.Close.displayName

export { 
  Popover, 
  PopoverTrigger, 
  PopoverContent, 
  PopoverAnchor,
  PopoverHeader,
  PopoverTitle,
  PopoverDescription,
  PopoverClose
}
