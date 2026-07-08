import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
    title: "Bennett Growth OS | AI Automation",
    description: "AI-Powered Marketing & Operations managed by ScalePods",
    icons: {
        icon: [{ url: '/favicon.svg', type: 'image/svg+xml' }, { url: '/bennett-logo.png', type: 'image/png' }],
        shortcut: '/favicon.svg',
        apple: '/bennett-logo.png',
    },
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en" className="antialiased dark" suppressHydrationWarning>
            <body>{children}</body>
        </html>
    );
}
