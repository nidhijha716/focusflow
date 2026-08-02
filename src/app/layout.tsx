import type { Metadata, Viewport } from "next";
import { DM_Sans } from "next/font/google";
import { ThemeProvider } from "next-themes";
import { PwaRegistration } from "@/components/layout/PwaRegistration";
import { SkipLink } from "@/components/layout/SkipLink";
import { TimerProvider } from "@/providers/TimerProvider";
import { SITE_URL } from "@/constants/site.constants";
import "./globals.css";

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Pomodoro",
    template: "%s | Pomodoro",
  },
  description:
    "A free, local-first Pomodoro timer PWA with tasks, streaks and stats. No signup, no tracking -- everything stays on your device.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "Pomodoro",
    statusBarStyle: "black-translucent",
  },
};

// `themeColor`/`colorScheme` moved out of `Metadata` into a dedicated
// `viewport` export in the current Metadata API (see
// node_modules/next/dist/lib/metadata/types/metadata-interface.d.ts --
// `Metadata.themeColor` is marked `@deprecated`, "use the new viewport
// configuration instead").
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f7f7f5" },
    { media: "(prefers-color-scheme: dark)", color: "#0f1115" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${dmSans.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col font-sans">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <SkipLink />
          <PwaRegistration />
          <TimerProvider>{children}</TimerProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}