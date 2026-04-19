import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'ReelForge — Générateur de Montages IA',
  description:
    'Transforme tes vidéos brutes en Reels Instagram viraux grâce à l\'IA. Analyse automatique du style, coupes dynamiques, sous-titres et effets.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr">
      <body className="min-h-screen bg-surface text-white">
        {children}
      </body>
    </html>
  );
}
