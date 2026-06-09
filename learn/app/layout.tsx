import type { Metadata } from 'next'
import { Sidebar } from '@/components/Sidebar'
import './globals.css'

export const metadata: Metadata = {
  title: 'Acme Finance Academy',
  description: 'Learn finance terminology, dashboard navigation, and AI agent architecture for the Acme Robotics Finance Command Center.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body>
        <div className="flex min-h-screen">
          <Sidebar />
          <main className="flex-1 overflow-y-auto">
            <div className="max-w-4xl mx-auto px-8 py-10">{children}</div>
          </main>
        </div>
      </body>
    </html>
  )
}
