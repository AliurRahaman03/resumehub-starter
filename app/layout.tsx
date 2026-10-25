import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ResumeHub",
  description: "A private place to organize resumes by job role.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}