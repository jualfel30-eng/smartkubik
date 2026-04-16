import * as React from "react"
import { useIsMobile } from "@/hooks/use-mobile"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer"
import { cn } from "@/lib/utils"

/**
 * ResponsiveDialog — renders as Dialog on desktop, Drawer (bottom sheet) on mobile.
 *
 * Drop-in replacement for Dialog. On mobile (<600px), renders a vaul Drawer
 * that slides up from bottom with drag-to-dismiss. On desktop, renders the
 * standard centered Dialog.
 *
 * Usage:
 *   <ResponsiveDialog open={open} onOpenChange={setOpen}>
 *     <ResponsiveDialogTrigger asChild>
 *       <Button>Open</Button>
 *     </ResponsiveDialogTrigger>
 *     <ResponsiveDialogContent>
 *       <ResponsiveDialogHeader>
 *         <ResponsiveDialogTitle>Title</ResponsiveDialogTitle>
 *         <ResponsiveDialogDescription>Description</ResponsiveDialogDescription>
 *       </ResponsiveDialogHeader>
 *       {children}
 *       <ResponsiveDialogFooter>
 *         <Button>Action</Button>
 *       </ResponsiveDialogFooter>
 *     </ResponsiveDialogContent>
 *   </ResponsiveDialog>
 */

function ResponsiveDialog({ children, ...props }) {
  const isMobile = useIsMobile()
  const Comp = isMobile ? Drawer : Dialog
  return <Comp {...props}>{children}</Comp>
}

function ResponsiveDialogTrigger({ ...props }) {
  const isMobile = useIsMobile()
  const Comp = isMobile ? DrawerTrigger : DialogTrigger
  return <Comp {...props} />
}

function ResponsiveDialogClose({ ...props }) {
  const isMobile = useIsMobile()
  const Comp = isMobile ? DrawerClose : DialogClose
  return <Comp {...props} />
}

function ResponsiveDialogContent({ className, children, ...props }) {
  const isMobile = useIsMobile()

  if (isMobile) {
    return (
      <DrawerContent
        className={cn("max-h-[92dvh] px-4 pb-6", className)}
        {...props}
      >
        <div className="overflow-y-auto overscroll-contain flex-1 pb-[env(safe-area-inset-bottom)]">
          {children}
        </div>
      </DrawerContent>
    )
  }

  return (
    <DialogContent className={className} {...props}>
      {children}
    </DialogContent>
  )
}

function ResponsiveDialogHeader({ className, ...props }) {
  const isMobile = useIsMobile()
  const Comp = isMobile ? DrawerHeader : DialogHeader
  return <Comp className={cn(isMobile && "px-0", className)} {...props} />
}

function ResponsiveDialogFooter({ className, ...props }) {
  const isMobile = useIsMobile()
  const Comp = isMobile ? DrawerFooter : DialogFooter
  return <Comp className={cn(isMobile && "px-0", className)} {...props} />
}

function ResponsiveDialogTitle({ ...props }) {
  const isMobile = useIsMobile()
  const Comp = isMobile ? DrawerTitle : DialogTitle
  return <Comp {...props} />
}

function ResponsiveDialogDescription({ ...props }) {
  const isMobile = useIsMobile()
  const Comp = isMobile ? DrawerDescription : DialogDescription
  return <Comp {...props} />
}

export {
  ResponsiveDialog,
  ResponsiveDialogTrigger,
  ResponsiveDialogClose,
  ResponsiveDialogContent,
  ResponsiveDialogHeader,
  ResponsiveDialogFooter,
  ResponsiveDialogTitle,
  ResponsiveDialogDescription,
}
