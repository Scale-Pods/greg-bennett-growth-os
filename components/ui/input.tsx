import * as React from "react"
import { cn } from "@/lib/utils"

export interface InputProps
    extends React.InputHTMLAttributes<HTMLInputElement> { }

const Input = React.forwardRef<HTMLInputElement, InputProps>(
    ({ className, type, ...props }, ref) => {
        return (
            <input
                type={type}
                suppressHydrationWarning={true}
                className={cn(
                    "flex h-9 w-full rounded-lg border border-hairline bg-fill-primary px-3 py-1 text-sm text-label shadow-sm transition-all file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-label placeholder:text-label-tertiary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-apple-blue/20 focus-visible:border-apple-blue disabled:cursor-not-allowed disabled:opacity-50",
                    className
                )}
                ref={ref}
                {...props}
            />
        )
    }
)
Input.displayName = "Input"

export { Input }
