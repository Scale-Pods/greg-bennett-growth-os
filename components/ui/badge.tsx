import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
    "inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold tracking-body transition-colors focus:outline-none focus:ring-2 focus:ring-ring/30 focus:ring-offset-2",
    {
        variants: {
            variant: {
                default:
                    "border-transparent bg-apple-blue text-white shadow-sm",
                secondary:
                    "border-transparent bg-fill-secondary text-label-secondary",
                destructive:
                    "border-transparent bg-apple-red text-white shadow-sm",
                outline: "border-hairline text-label-secondary bg-glass-bg",
            },
        },
        defaultVariants: {
            variant: "default",
        },
    }
)

export interface BadgeProps
    extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> { }

function Badge({ className, variant, ...props }: BadgeProps) {
    return (
        <div className={cn(badgeVariants({ variant }), className)} {...props} />
    )
}

export { Badge, badgeVariants }
