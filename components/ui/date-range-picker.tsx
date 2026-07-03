"use client"

import * as React from "react"
import { format, subDays, subMonths, subYears, startOfMonth, endOfMonth, startOfDay, endOfDay } from "date-fns"
import { Calendar as CalendarIcon } from "lucide-react"
import { DateRange } from "react-day-picker"

import { cn } from "@/lib/utils"
import { Calendar } from "@/components/ui/calendar"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"

export interface DateRangePickerProps extends React.HTMLAttributes<HTMLDivElement> {
    onUpdate?: (values: { range: DateRange | undefined, label?: string }) => void;
    value?: DateRange;
}

export function DateRangePicker({
    className,
    onUpdate,
    value,
}: DateRangePickerProps) {
    const [date, setDate] = React.useState<DateRange | undefined>(value || {
        from: subDays(new Date(), 7),
        to: new Date(),
    })

    const [tempDate, setTempDate] = React.useState<DateRange | undefined>(date)
    const [tempLabel, setTempLabel] = React.useState<string | undefined>("Last 7 days")
    const [open, setOpen] = React.useState(false)
    const [isMounted, setIsMounted] = React.useState(false)

    React.useEffect(() => {
        setIsMounted(true)
    }, [])

    React.useEffect(() => {
        if (value) {
            setDate(value)
        }
    }, [value])

    React.useEffect(() => {
        if (open) {
            setTempDate(date)
        }
    }, [open, date])

    if (!isMounted) {
        return <div className={cn("h-8 w-[190px] rounded-[8px] animate-pulse", className)} style={{ background: 'var(--fill-tertiary)' }}></div>
    }

    const presets = [
        {
            label: "Today",
            getValue: () => {
                const today = new Date();
                return { from: startOfDay(today), to: today };
            }
        },
        {
            label: "Yesterday",
            getValue: () => {
                const today = new Date();
                return { from: startOfDay(subDays(today, 1)), to: endOfDay(subDays(today, 1)) };
            }
        },
        {
            label: "Last 7 days",
            getValue: () => {
                const today = new Date();
                return { from: startOfDay(subDays(today, 7)), to: today };
            }
        },
        {
            label: "Last 30 days",
            getValue: () => {
                const today = new Date();
                return { from: startOfDay(subDays(today, 30)), to: today };
            }
        },
        {
            label: "This month",
            getValue: () => {
                const today = new Date();
                return { from: startOfDay(startOfMonth(today)), to: endOfMonth(today) };
            }
        },
    ];

    const handlePresetChange = (value: string) => {
        const preset = presets.find(p => p.label === value);
        if (preset) {
            setTempDate(preset.getValue());
            setTempLabel(value);
        }
    };

    const handleApply = () => {
        setDate(tempDate);
        setOpen(false);
        if (onUpdate) {
            onUpdate({ range: tempDate, label: tempLabel });
        }
    };

    const handleCancel = () => {
        setOpen(false);
    };

    const handleClear = () => {
        setDate(undefined);
        setTempDate(undefined);
        setTempLabel(undefined);
        if (onUpdate) {
            onUpdate({ range: undefined, label: undefined });
        }
    };

    return (
        <div className={cn("grid gap-2", className)}>
            <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                    <button
                        className="inline-flex items-center gap-1.5 h-8 px-2.5 rounded-[8px] bg-[var(--fill-tertiary)] hover:bg-[var(--fill-secondary)] border border-[var(--glass-border)] text-[var(--label-primary)] text-[12px] font-medium leading-none transition-colors whitespace-nowrap"
                    >
                        <CalendarIcon className="w-3 h-3 text-[var(--blue)] shrink-0" />
                        <span className="tabular-nums">
                            {date?.from ? (
                                date.to ? (
                                    <>
                                        {format(date.from, "MMM d")} – {format(date.to, "MMM d, yy")}
                                    </>
                                ) : (
                                    format(date.from, "MMM d, yyyy")
                                )
                            ) : (
                                <span className="text-[var(--label-tertiary)]">Pick a date</span>
                            )}
                        </span>
                    </button>
                </PopoverTrigger>
                <PopoverContent
                    className="w-auto max-w-none p-0 border border-[var(--glass-border)] bg-[var(--bg-layer1)] rounded-[10px] shadow-lg overflow-hidden"
                    align="end"
                    sideOffset={6}
                >
                    <div className="flex">
                        {/* Preset List */}
                        <div className="p-1.5 border-r border-[var(--glass-border)] w-[124px] flex flex-col gap-0.5">
                            {presets.map((preset) => (
                                <button
                                    key={preset.label}
                                    onClick={() => handlePresetChange(preset.label)}
                                    className={`w-full text-left px-2 py-1 rounded-[6px] text-[11.5px] font-medium leading-tight transition-colors ${tempLabel === preset.label ? 'text-[var(--blue)] bg-[var(--blue)]/10' : 'text-[var(--label-secondary)] hover:text-[var(--label-primary)] hover:bg-[var(--fill-tertiary)]'}`}
                                >
                                    {preset.label}
                                </button>
                            ))}
                            <div className="h-px bg-[var(--glass-border)] my-1" />
                            <button
                                onClick={() => setTempLabel("Custom Range")}
                                className={`w-full text-left px-2 py-1 rounded-[6px] text-[11.5px] font-medium leading-tight transition-colors ${tempLabel === "Custom Range" ? 'text-[var(--blue)] bg-[var(--blue)]/10' : 'text-[var(--label-tertiary)] hover:text-[var(--label-primary)] hover:bg-[var(--fill-tertiary)]'}`}
                            >
                                Custom Range
                            </button>
                        </div>
                        {/* Calendar */}
                        <div className="p-0">
                            <Calendar
                                initialFocus
                                mode="range"
                                defaultMonth={tempDate?.from}
                                selected={tempDate}
                                onSelect={(val) => {
                                    setTempDate(val);
                                    setTempLabel("Custom Range");
                                }}
                                numberOfMonths={1}
                                className="p-2"
                            />
                        </div>
                    </div>
                    {/* Action Footer */}
                    <div className="px-2.5 py-1.5 border-t border-[var(--glass-border)] flex items-center justify-end gap-1.5 bg-[var(--fill-quaternary)]">
                        <button
                            onClick={handleClear}
                            className="mr-auto px-2 py-1 rounded-[6px] text-[11px] font-semibold text-red-500 hover:bg-red-500/10 transition-colors"
                        >
                            Clear
                        </button>
                        <button
                            onClick={handleCancel}
                            className="px-2.5 py-1 rounded-[6px] text-[11px] font-medium text-[var(--label-secondary)] hover:bg-[var(--fill-tertiary)] transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleApply}
                            className="px-3 py-1 rounded-[6px] text-[11px] font-semibold text-white bg-[var(--blue)] hover:opacity-90 transition-opacity"
                        >
                            Apply
                        </button>
                    </div>
                </PopoverContent>
            </Popover>
        </div>
    )
}
