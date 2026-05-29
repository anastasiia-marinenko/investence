// Обов'язкова директива для Next.js — компонент використовує хуки
"use client"

// Імпорти Radix UI примітивів + утиліта для об'єднання класів
import * as React from "react"
import * as TooltipPrimitive from "@radix-ui/react-tooltip"

import { cn } from "@/lib/utils"

// Провайдер контексту: має огортати дерево, де використовуються тултіпи
const TooltipProvider = TooltipPrimitive.Provider

// Кореневий компонент: керує станом відкриття/закриття тултіпа
const Tooltip = TooltipPrimitive.Root

// Тригер: елемент, при наведенні/кліку на який з'являється підказка
const TooltipTrigger = TooltipPrimitive.Trigger

// Контент тултіпа: позиціонування, анімації, стилізація через cn()
const TooltipContent = React.forwardRef<
  React.ElementRef<typeof TooltipPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Content>
>(({ className, sideOffset = 4, ...props }, ref) => (
  <TooltipPrimitive.Portal>
    <TooltipPrimitive.Content
      ref={ref}
      sideOffset={sideOffset}
      // Базові стилі + анімації появи/зникнення залежно від сторони та стану
      className={cn(
        "z-50 overflow-hidden rounded-md bg-primary px-3 py-1.5 text-xs text-primary-foreground animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 origin-[--radix-tooltip-content-transform-origin]",
        className
      )}
      {...props}
    />
  </TooltipPrimitive.Portal>
))
TooltipContent.displayName = TooltipPrimitive.Content.displayName

// Експорт компонентів для використання в додатку
export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider }