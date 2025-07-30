// src/app/layout.tsx
import "./globals.css";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { Toaster } from "@/components/ui/sonner";

export const metadata = {
  title: "Python IDE",
  description: "Online Python console IDE",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full" suppressHydrationWarning>
      {/* h-dvh: chiều cao động theo viewport hiện tại, tốt hơn 100vh trên mobile */}
      <body className="h-dvh">
        <ThemeProvider>
          {children}
        </ThemeProvider>
        <Toaster />
      </body>
    </html>
  );
}
