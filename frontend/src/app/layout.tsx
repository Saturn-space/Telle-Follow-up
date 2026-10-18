import type { Metadata } from 'next';
import React from 'react';
import { AuthProvider } from '../context/AuthContext';
import { Sidebar } from '../components/shared/Sidebar';
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
      <body className="bg-slate-50 text-slate-900 antialiased font-sans">
        <AuthProvider>
          <div className="flex min-h-screen">
            <Sidebar />
            <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
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
