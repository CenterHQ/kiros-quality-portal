import type { Metadata } from "next";
import { Karla } from "next/font/google";
import "./globals.css";

const karla = Karla({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Kiro's Early Education Centre — Quality Uplift Portal",
  description: "Collaborative platform for quality uplift following Assessment & Rating",
  icons: {
    icon: '/favicon.ico',
    apple: '/apple-icon.png',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${karla.className} bg-gray-50 text-gray-900`}>
        {children}
      </body>
    </html>
  );
}
