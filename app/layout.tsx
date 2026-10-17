import type {Metadata} from 'next';
import './globals.css'; // Global styles

export const metadata: Metadata = {
  title: 'Tele-Follow-Up Orchestrator',
  description: 'An AI-Assisted Post-Surgical Follow-Up Coordination System to streamline patient recovery, risk assessment, local care discovery, travel analysis, and teleconsultation.',
  openGraph: {
    title: 'Tele-Follow-Up Orchestrator',
    description: 'An AI-Assisted Post-Surgical Follow-Up Coordination System to streamline patient recovery, risk assessment, local care discovery, travel analysis, and teleconsultation.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Tele-Follow-Up Orchestrator',
    description: 'An AI-Assisted Post-Surgical Follow-Up Coordination System to streamline patient recovery, risk assessment, local care discovery, travel analysis, and teleconsultation.',
  },
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="en">
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
