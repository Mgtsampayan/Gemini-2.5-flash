import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { ThemeProvider } from "@/components/theme-provider";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "AI Chatbot 2025 | Gemini Powered",
  description:
    "Enterprise-grade AI assistant powered by Google Gemini 2.5. Get instant answers, code help, and creative solutions.",
  keywords: ["AI", "Chatbot", "Gemini", "Google AI", "Assistant"],
  authors: [{ name: "Gemuel Sampayan" }],
  openGraph: {
    title: "AI Chatbot 2025",
    description: "Enterprise-grade AI assistant powered by Google Gemini",
    type: "website",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fafafb" },
    { media: "(prefers-color-scheme: dark)", color: "#0d0a1a" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans antialiased`} suppressHydrationWarning>
        <ThemeProvider defaultTheme="system" storageKey="ai-chatbot-theme">
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
