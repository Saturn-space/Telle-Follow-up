import type {Metadata} from 'next';
import './globals.css'; // Global styles

export const metadata: Metadata = {
  title: 'Tele-Follow-Up Orchestrator',
  description: 'An AI-Assisted Post-Surgical Follow-Up Coordination System to optimize recovery monitoring, risk assessment, local care discovery, and follow-up teleconsultation.',
  openGraph: {
    title: 'Tele-Follow-Up Orchestrator',
    description: 'An AI-Assisted Post-Surgical Follow-Up Coordination System to optimize recovery monitoring, risk assessment, local care discovery, and follow-up teleconsultation.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Tele-Follow-Up Orchestrator',
    description: 'An AI-Assisted Post-Surgical Follow-Up Coordination System to optimize recovery monitoring, risk assessment, local care discovery, and follow-up teleconsultation.',
  },
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
