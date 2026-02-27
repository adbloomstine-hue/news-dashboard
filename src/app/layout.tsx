import type { Metadata } from "next";
import { Inter, Space_Grotesk, Playfair_Display } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk",
  display: "swap",
});

// Editorial serif — used for public dashboard headlines & masthead
const playfairDisplay = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
  display: "swap",
  weight: ["400", "500", "600", "700", "800", "900"],
});

export const metadata: Metadata = {
  title: {
    template: "%s | News Dashboard",
    default:  process.env.NEXT_PUBLIC_SITE_NAME ?? "News Dashboard",
  },
  description:
    "Private news aggregation and curation dashboard for California gaming and gaming industry news.",
  robots: { index: false, follow: false }, // Private dashboard — no indexing
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${inter.variable} ${spaceGrotesk.variable} ${playfairDisplay.variable} font-sans`}>
        {children}
      </body>
    </html>
  );
}
