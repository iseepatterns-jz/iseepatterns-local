import type { Metadata } from "next";
import "./globals.css";
import Sidebar from "@/components/Sidebar";
import Providers from "@/components/Providers";

export const metadata: Metadata = {
  title: "iseepatterns — Forensic Investigation System",
  description:
    "Multi-client, multi-case forensic data investigation dashboard. Communications, transcripts, financials, and legal document analysis.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <Providers>
          <Sidebar />
          <main className="main-content">{children}</main>
        </Providers>
      </body>
    </html>
  );
}

