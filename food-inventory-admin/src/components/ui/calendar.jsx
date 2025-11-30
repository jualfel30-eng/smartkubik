import * as React from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { DayPicker } from "react-day-picker"

import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn("!p-4 !bg-white dark:!bg-gray-900 !rounded-lg !border !border-gray-200 dark:!border-gray-800", className)}
      classNames={{
        months: "flex flex-col sm:flex-row gap-2",
        month: "flex flex-col gap-4",
        caption: "flex justify-center !pt-1 relative items-center w-full !pb-2",
        caption_label: "!text-base !font-semibold dark:!text-gray-100",
        nav: "flex items-center gap-1",
        nav_button: cn(
          buttonVariants({ variant: "outline" }),
          "size-7 !bg-transparent p-0 opacity-50 hover:opacity-100 dark:!border-gray-700 dark:hover:!bg-gray-800 !transition-colors"
        ),
        nav_button_previous: "absolute left-1",
        nav_button_next: "absolute right-1",
        table: "w-full border-collapse",
        head_row: "flex !mb-2",
        head_cell:
          "!text-gray-600 dark:!text-gray-400 rounded-md flex-1 !font-medium !text-sm",
        row: "flex w-full !mt-1",
        cell: cn(
          "relative !p-0.5 text-center text-sm focus-within:relative focus-within:z-20 [&:has([aria-selected])]:bg-accent [&:has([aria-selected].day-range-end)]:rounded-r-md flex-1",
          props.mode === "range"
            ? "[&:has(>.day-range-end)]:rounded-r-md [&:has(>.day-range-start)]:rounded-l-md first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md"
            : "[&:has([aria-selected])]:rounded-md"
        ),
        day: cn(
          buttonVariants({ variant: "ghost" }),
          "!h-10 !w-full !p-0 !font-medium aria-selected:opacity-100 hover:!bg-blue-50 dark:hover:!bg-gray-800 !transition-all !rounded-lg"
        ),
        day_range_start:
          "day-range-start aria-selected:!bg-primary aria-selected:!text-primary-foreground",
        day_range_end:
          "day-range-end aria-selected:!bg-primary aria-selected:!text-primary-foreground",
        day_selected:
          "!bg-blue-600 !text-white hover:!bg-blue-700 focus:!bg-blue-700 dark:!bg-blue-600 dark:!text-white !shadow-md",
        day_today: "!bg-blue-50 dark:!bg-blue-900/20 !text-blue-700 dark:!text-blue-300 !border-2 !border-blue-400 dark:!border-blue-600 !font-bold !shadow-sm",
        day_outside:
          "day-outside !text-gray-400 dark:!text-gray-600 !opacity-50 aria-selected:!text-muted-foreground",
        day_disabled: "!text-gray-300 dark:!text-gray-700 !opacity-40",
        day_range_middle:
          "aria-selected:!bg-accent aria-selected:!text-accent-foreground",
        day_hidden: "invisible",
        ...classNames,
      }}
      components={{
        IconLeft: ({ className, ...props }) => (
          <ChevronLeft className={cn("size-4", className)} {...props} />
        ),
        IconRight: ({ className, ...props }) => (
          <ChevronRight className={cn("size-4", className)} {...props} />
        ),
      }}
      {...props} />
  );
}

export { Calendar }
