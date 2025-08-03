import type { Metadata, Viewport } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'PlayMate - Sports Management',
  description: 'Comprehensive sports team management application with real-time features',
  generator: 'Next.js',
  manifest: '/manifest.json',
  keywords: ['sports', 'team management', 'soccer', 'football', 'basketball', 'league'],
  authors: [{ name: 'PlayMate Team' }],
  icons: {
    icon: '/icons/icon-192x192.png',
    shortcut: '/icons/icon-72x72.png',
    apple: '/icons/icon-152x152.png',
  },
  openGraph: {
    title: 'PlayMate - Sports Management',
    description: 'Manage your sports teams, schedule matches, and track player statistics',
    url: 'https://playmate.app',
    siteName: 'PlayMate',
    images: [
      {
        url: '/screenshots/desktop-1.png',
        width: 1280,
        height: 720,
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'PlayMate - Sports Management',
    description: 'Manage your sports teams, schedule matches, and track player statistics',
    images: ['/screenshots/desktop-1.png'],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'PlayMate',
  },
}

export const viewport: Viewport = {
  themeColor: '#3b82f6',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="PlayMate" />
        <meta name="msapplication-TileColor" content="#3b82f6" />
        <meta name="msapplication-tap-highlight" content="no" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js')
                    .then(function(registration) {
                      console.log('SW registered: ', registration);
                    })
                    .catch(function(registrationError) {
                      console.log('SW registration failed: ', registrationError);
                    });
                });
              }
            `,
          }}
        />
      </head>
      <body className="antialiased">{children}</body>
    </html>
  )
}
