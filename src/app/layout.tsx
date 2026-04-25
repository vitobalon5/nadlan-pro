import type { Metadata } from 'next';
import { Inter, Heebo } from 'next/font/google';
import { ThemeProvider } from '@/components/theme-provider';
import { CommandBarProvider } from '@/components/command-bar/command-bar-provider';
import './globals.css';

// Inter for Latin/numbers (the "premium feel" font)
// Heebo for Hebrew (free Hebrew font, optimized for screens, pairs well with Inter)
// Both load with display:swap so content shows immediately with system font fallback
const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
  weight: ['400', '500', '600', '700'],
});
const heebo = Heebo({
  subsets: ['hebrew', 'latin'],
  variable: '--font-heebo',
  display: 'swap',
  weight: ['400', '500', '600', '700'],
});

export const metadata: Metadata = {
  title: 'Nadlan Pro — פלטפורמת ניהול נדל"ן',
  description: 'ניהול, ניתוח וצפייה בשוק הנדל"ן',
};

const themeScript = `
(function() {
  try {
    var stored = localStorage.getItem('nadlan-theme');
    var theme = stored || 'system';
    var resolved = theme === 'system'
      ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
      : theme;
    document.documentElement.classList.toggle('dark', resolved === 'dark');
    document.documentElement.style.colorScheme = resolved;
  } catch (e) {}
})();
`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="he"
      dir="rtl"
      suppressHydrationWarning
      className={`${inter.variable} ${heebo.variable}`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-screen bg-background font-sans antialiased">
        <ThemeProvider>
          <CommandBarProvider>{children}</CommandBarProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
