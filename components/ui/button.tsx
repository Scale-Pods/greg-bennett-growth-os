import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const buttonVariants = cva(
    "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-semibold tracking-body transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
    {
        variants: {
            variant: {
                default:
                    "bg-apple-blue text-white shadow-sm hover:bg-apple-blue/90 active:scale-[0.97]",
                destructive:
                    "bg-apple-red text-white shadow-sm hover:bg-apple-red/90 active:scale-[0.97]",
                outline:
                    "border border-hairline text-label bg-glass-bg backdrop-blur-[20px] shadow-sm hover:bg-fill-secondary/60 active:scale-[0.97]",
                secondary:
                    "bg-fill-secondary text-label shadow-sm hover:bg-fill-tertiary/80 active:scale-[0.97]",
                ghost: "text-label-secondary hover:text-label hover:bg-fill-secondary/60 active:scale-[0.97]",
                link: "text-apple-blue underline-offset-4 hover:underline",
            },
            size: {
                default: "h-9 px-4 py-2",
                sm: "h-8 rounded-md px-3 text-xs",
                lg: "h-10 rounded-lg px-8",
                icon: "h-9 w-9",
            },
        },
        defaultVariants: {
            variant: "default",
            size: "default",
        },
    }
)

export interface ButtonProps
    extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
    asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
    ({ className, variant, size, asChild = false, ...props }, ref) => {
        const Comp = asChild ? Slot : "button"
        return (
            <Comp
                className={cn(buttonVariants({ variant, size, className }))}
                ref={ref}
                suppressHydrationWarning={true}
                {...props}
            />
        )
    }
)
Button.displayName = "Button"

export { Button, buttonVariants }
