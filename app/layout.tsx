import { ClerkProvider } from '@clerk/nextjs'
import { Toaster } from 'react-hot-toast';
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";
import type { Metadata } from "next";

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
      <html lang="ar" dir="rtl">
        <body>
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
