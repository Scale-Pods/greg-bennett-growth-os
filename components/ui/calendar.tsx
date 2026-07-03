"use client"

import * as React from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { DayPicker } from "react-day-picker"

import { cn } from "@/lib/utils"

export type CalendarProps = React.ComponentProps<typeof DayPicker>

function Calendar({
    className,
    classNames,
    showOutsideDays = true,
    ...props
}: CalendarProps) {
    return (
        <DayPicker
            showOutsideDays={showOutsideDays}
            className={cn("p-3", className)}
            classNames={{
                months: "flex flex-col sm:flex-row space-y-3 sm:space-x-3 sm:space-y-0",
                month: "space-y-2",
                caption: "flex justify-center pt-1 relative items-center",
                caption_label: "text-[12.5px] font-semibold",
                nav: "space-x-1 flex items-center",
                nav_button: cn(
                    "h-6 w-6 p-0 flex items-center justify-center rounded-md transition-colors",
                    "opacity-60 hover:opacity-100"
                ),
                nav_button_previous: "absolute left-1",
                nav_button_next: "absolute right-1",
                table: "w-full border-collapse space-y-1",
                head_row: "flex",
                head_cell: "rounded-md w-7 font-medium text-[0.7rem] text-center text-[var(--label-tertiary)]",
                row: "flex w-full mt-1",
                cell: cn(
                    "relative p-0 text-center text-sm focus-within:relative focus-within:z-20",
                    "[&:has([aria-selected])]:cal-range-bg",
                    props.mode === "range"
                        ? "[&:has(>.day-range-end)]:rounded-r-md [&:has(>.day-range-start)]:rounded-l-md first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md"
                        : "[&:has([aria-selected])]:rounded-md"
                ),
                day: cn(
                    "h-7 w-7 p-0 font-normal rounded-md transition-colors aria-selected:opacity-100",
                    "inline-flex items-center justify-center text-[12px]"
                ),
                day_range_start: "day-range-start",
                day_range_end: "day-range-end",
                day_selected: "cal-day-selected",
                day_today: "cal-day-today",
                day_outside: "day-outside opacity-30",
                day_disabled: "opacity-30 cursor-not-allowed",
                day_range_middle: "cal-day-range-middle",
                day_hidden: "invisible",
                ...classNames,
            }}
            components={{
                IconLeft: () => <ChevronLeft className="h-4 w-4" />,
                IconRight: () => <ChevronRight className="h-4 w-4" />,
            }}
            {...props}
        />
    )
}
Calendar.displayName = "Calendar"

export { Calendar }
