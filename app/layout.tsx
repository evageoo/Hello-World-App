import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Caption Rater - Week 5 AI",
  description: "Image Upload and AI Caption Generation",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body style={{ margin: 0, backgroundColor: "#fff" }}>
        {children}
      </body>
    </html>
  );
}