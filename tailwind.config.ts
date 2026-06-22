import type { Config } from "tailwindcss";

const config: Config = {
    darkMode: ["class"],
    content: [
        "./pages/**/*.{js,ts,jsx,tsx,mdx}",
        "./components/**/*.{js,ts,jsx,tsx,mdx}",
        "./app/**/*.{js,ts,jsx,tsx,mdx}",
    ],
    theme: {
        extend: {
            fontFamily: {
                sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'system-ui', 'sans-serif'],
                mono: ['ui-monospace', 'SF Mono', 'SFMono-Regular', 'Menlo', 'monospace'],
            },
            colors: {
                label: {
                    DEFAULT:    'var(--label-primary)',
                    primary:    'var(--label-primary)',
                    secondary:  'var(--label-secondary)',
                    tertiary:   'var(--label-tertiary)',
                    quaternary: 'var(--label-quaternary)',
                },
                fill: {
                    primary:    'var(--fill-primary)',
                    secondary:  'var(--fill-secondary)',
                    tertiary:   'var(--fill-tertiary)',
                    quaternary: 'var(--fill-quaternary)',
                },
                glass: {
                    fill:   'var(--glass-fill)',
                    border: 'var(--glass-border)',
                },
                apple: {
                    blue:   'var(--blue)',
                    green:  'var(--green)',
                    indigo: 'var(--indigo)',
                    orange: 'var(--orange)',
                    pink:   'var(--pink)',
                    purple: 'var(--purple)',
                    red:    'var(--red)',
                    teal:   'var(--teal)',
                    yellow: 'var(--yellow)',
                    brown:  'var(--brown)',
                    cyan:   'var(--cyan)',
                },
                separator:  'var(--separator)',
                hairline:   'var(--hairline)',
                sidebar: {
                    bg:     'var(--sidebar-bg)',
                    border: 'var(--sidebar-border)',
                },
                background:     'var(--bg-app)',
                foreground:     'var(--label-primary)',
                card: {
                    DEFAULT:    'var(--glass-fill)',
                    foreground: 'var(--label-primary)',
                },
                popover: {
                    DEFAULT:    'var(--glass-fill)',
                    foreground: 'var(--label-primary)',
                },
                primary: {
                    DEFAULT:    'var(--blue)',
                    foreground: '#ffffff',
                },
                secondary: {
                    DEFAULT:    'var(--fill-secondary)',
                    foreground: 'var(--label-primary)',
                },
                muted: {
                    DEFAULT:    'var(--fill-tertiary)',
                    foreground: 'var(--label-secondary)',
                },
                accent: {
                    DEFAULT:    'var(--blue)',
                    foreground: '#ffffff',
                },
                destructive: {
                    DEFAULT:    'var(--red)',
                    foreground: '#ffffff',
                },
                border: 'var(--hairline)',
                input:  'var(--fill-secondary)',
                ring:   'var(--blue)',
                chart: {
                    '1': 'var(--blue)',
                    '2': 'var(--green)',
                    '3': 'var(--orange)',
                    '4': 'var(--indigo)',
                    '5': 'var(--red)',
                },
            },
            borderRadius: {
                xs:   'var(--radius-xs)',
                sm:   'var(--radius-sm)',
                md:   'var(--radius-md)',
                lg:   'var(--radius-lg)',
                xl:   'var(--radius-xl)',
                '2xl':'var(--radius-2xl)',
                '3xl':'var(--radius-3xl)',
                full: 'var(--radius-full)',
            },
            boxShadow: {
                sm:           'var(--shadow-sm)',
                md:           'var(--shadow-md)',
                lg:           'var(--shadow-lg)',
                xl:           'var(--shadow-xl)',
                glass:        'var(--glass-shadow)',
                'glass-hover':'var(--glass-shadow-hover)',
            },
            backdropBlur: {
                glass: '0px',
            },
            spacing: {
                '0.5': 'var(--space-0-5)',
                '1':   'var(--space-1)',
                '1.5': 'var(--space-1-5)',
                '2':   'var(--space-2)',
                '3':   'var(--space-3)',
                '4':   'var(--space-4)',
                '5':   'var(--space-5)',
                '6':   'var(--space-6)',
                '8':   'var(--space-8)',
            },
            letterSpacing: {
                heading:   'var(--ls-heading)',
                body:      'var(--ls-body)',
                metric:    'var(--ls-metric)',
                'nav-label':'var(--ls-nav-label)',
            },
            transitionTimingFunction: {
                'spring':   'var(--ease-spring)',
                'standard': 'var(--ease-standard)',
                'decel':    'var(--ease-decel)',
                'accel':    'var(--ease-accel)',
            },
            animation: {
                'spring-in': 'spring-in 0.28s var(--ease-spring)',
                'fade-in':   'fade-in 0.18s var(--ease-decel)',
                'slide-up':  'slide-up 0.28s var(--ease-spring)',
                'pulse-live':'pulse-live 2s ease-in-out infinite',
            },
            keyframes: {
                'spring-in': {
                    '0%':   { opacity: '0', transform: 'scale(0.97) translateY(4px)' },
                    '100%': { opacity: '1', transform: 'scale(1) translateY(0)' },
                },
                'fade-in': {
                    '0%':   { opacity: '0' },
                    '100%': { opacity: '1' },
                },
                'slide-up': {
                    '0%':   { opacity: '0', transform: 'translateY(8px)' },
                    '100%': { opacity: '1', transform: 'translateY(0)' },
                },
                'pulse-live': {
                    '0%, 100%': { opacity: '1', transform: 'scale(1)' },
                    '50%':      { opacity: '0.5', transform: 'scale(0.85)' },
                },
            },
        },
    },
    plugins: [require("tailwindcss-animate")],
};
export default config;
