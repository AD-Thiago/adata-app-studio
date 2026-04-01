import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import Link from 'next/link'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'AData App Studio',
  description: 'Gere aplicações completas via agentes de IA',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt-BR">
      <body className={inter.className}>
        <div className="min-h-screen bg-gray-950 text-gray-100">
          <nav className="border-b border-gray-800 px-6 py-4 flex items-center justify-between">
            <Link href="/" className="text-xl font-bold text-violet-400">
              AData App Studio
            </Link>
            <Link
              href="/new"
              className="bg-violet-600 hover:bg-violet-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              + Novo Projeto
            </Link>
          </nav>
          <main className="container mx-auto px-6 py-8">
            {children}
          </main>
        </div>
      </body>
    </html>
  )
}
