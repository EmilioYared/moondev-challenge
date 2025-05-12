import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { Toaster } from 'react-hot-toast';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'MoonDev Challenge',
  description: 'Developer Application Platform',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-gray-100 min-h-screen flex flex-col`}>
        <main className="container mx-auto px-4 py-8 flex-grow">
          {children}
        </main>
        <Toaster position="top-right" />
      </body>
    </html>
  );
}
