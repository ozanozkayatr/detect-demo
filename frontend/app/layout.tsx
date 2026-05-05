import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";

import "./globals.css";

export const metadata: Metadata = {
  title: "detect-demo",
  description: "Local-first scaffold for boxing video analysis.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <div className="shell">
          <header className="topbar">
            <Link className="brand" href="/">
              <span className="brand-mark" aria-hidden="true" />
              <span>detect-demo</span>
            </Link>
            <nav className="nav" aria-label="Primary">
              <Link href="/">Overview</Link>
              <Link href="/status">Status</Link>
              <Link href="/upload">Upload</Link>
            </nav>
          </header>
          {children}
        </div>
      </body>
    </html>
  );
}
