import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: '包裹智检｜退货包裹破损检测',
  description: '京东退货包裹破损 AI 识别与智能定损工作台',
  openGraph: {
    title: '包裹智检｜退货包裹破损检测',
    description: '京东退货包裹破损 AI 识别与智能定损工作台',
    type: 'website',
    images: [{ url: '/og.png', width: 1200, height: 630, alt: '包裹智检' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: '包裹智检｜退货包裹破损检测',
    description: '京东退货包裹破损 AI 识别与智能定损工作台',
    images: ['/og.png'],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
