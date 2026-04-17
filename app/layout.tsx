import { ClerkProvider } from '@clerk/nextjs'
import { Toaster } from 'react-hot-toast';
import { Analytics } from "@vercel/analytics/next";
import { Tajawal } from "next/font/google";
import "./globals.css";
import type { Metadata, Viewport } from "next";

const tajawal = Tajawal({ 
  subsets: ["arabic"], 
  weight: ["300", "400", "500", "700", "800"], 
  variable: "--font-tajawal" 
});

export const metadata: Metadata = {
  title: "Smart Clinic",
  description: "AI WhatsApp Receptionist for your Clinic",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClerkProvider>
      <html lang="ar" dir="rtl" className={tajawal.variable}>
        <body className={tajawal.className}>
          <Toaster 
            position="top-center" 
            toastOptions={{
              className: 'font-sans font-medium',
              style: { direction: 'rtl' }
            }} 
          />
          {children}
          <Analytics />
        </body>
      </html>
    </ClerkProvider>
  );
}
