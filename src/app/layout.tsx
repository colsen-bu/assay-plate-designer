import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: "Assay Plate Designer - Plan Your Experiments",
  description: "Easily design, manage, and export assay plate layouts for biological experiments. Supports various plate types and features like edge effect handling and randomization.",
  keywords: ["assay plate", "experiment design", "biology", "lab tool", "microplate", "well plate", "titration", "drug discovery"],
  applicationName: "Assay Plate Designer",
  authors: [{ name: "Chris Olsen" }], // TODO: Update with actual author info
  // Add other relevant metadata fields as needed
  // openGraph: { ... },
  // twitter: { ... },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: 'Assay Plate Designer',
    description: metadata.description,
    applicationCategory: 'ScienceApplication',
    operatingSystem: 'All', // Assuming it's web-based
    url: 'https://www.plate.mcvcllmhgb.com', // TODO: Update with your actual domain
    // Add other relevant schema properties
  };

  return (
    <html lang="en">
      <head>
        {/* Add JSON-LD structured data */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
