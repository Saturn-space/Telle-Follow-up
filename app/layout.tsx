import type { Metadata } from 'next';
import React from 'react';
import { AuthProvider } from '@/context/AuthContext';
import { Sidebar } from '@/components/shared/Sidebar';
import './globals.css';

export const metadata: Metadata = {
  title: 'Tele-Follow-Up Orchestrator',
  description:
    'An AI-Assisted Post-Surgical Follow-Up Coordination System to streamline patient recovery, risk assessment, local care discovery, travel analysis, and teleconsultation.',
  openGraph: {
    title: 'Tele-Follow-Up Orchestrator',
    description:
      'An AI-Assisted Post-Surgical Follow-Up Coordination System connecting patients, clinicians, and local care providers.',
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Geist:wght@100..900&family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-surface text-on-surface antialiased font-sans selection:bg-primary-fixed selection:text-on-primary-fixed">
        <AuthProvider>
          <div className="flex min-h-screen">
            <Sidebar />
            <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-surface">
              <main className="flex-1 overflow-y-auto">
                {children}
              </main>
            </div>
          </div>
        </AuthProvider>
      </body>
    </html>
  );
}
