import { cn } from "@workspace/ui/lib/utils";
import type { Metadata } from "next";

import "@workspace/ui/globals.css";
import { Geist_Mono, Inter } from "next/font/google";

import { ThemeProvider } from "@/components/theme-provider";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });

const fontMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
});

export const metadata: Metadata = {
  title: { default: "Quiver Dashboard", template: "%s — Quiver Dashboard" },
};

const RootLayout = ({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) => (
  <html
    lang="en"
    suppressHydrationWarning
    className={cn(
      "antialiased",
      fontMono.variable,
      "font-sans",
      inter.variable
    )}
  >
    <body>
      <ThemeProvider>{children}</ThemeProvider>
    </body>
  </html>
);

export default RootLayout;
