'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'

type Project = {
  id: string
  name: string
  description: string
  status: string
  created_at: string
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  draft: { label: 'Rascunho', color: 'bg-gray-700 text-gray-300' },
  prd_generated: { label: 'PRD Gerado', color: 'bg-blue-900 text-blue-300' },
  reviewed: { label: 'Revisado', color: 'bg-yellow-900 text-yellow-300' },
  github_created: { label: 'No GitHub', color: 'bg-green-900 text-green-300' },
}

export default function DashboardPage() {
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/projects`)
      .then(r => r.json())
      .then(data => { setProjects(data); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  if (loading) return <div className="text-center py-20 text-gray-400">Carregando projetos...</div>

  if (projects.length === 0) return (
    <div className="text-center py-20">
      <p className="text-gray-400 mb-6">Nenhum projeto ainda. Crie o primeiro!</p>
      <Link href="/new" className="bg-violet-600 hover:bg-violet-700 text-white px-6 py-3 rounded-lg font-medium">
        + Novo Projeto
      </Link>
    </div>
  )

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Meus Projetos</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {projects.map(p => {
          const s = STATUS_LABELS[p.status] || { label: p.status, color: 'bg-gray-700 text-gray-300' }
          return (
            <Link key={p.id} href={`/projects/${p.id}`}
              className="block bg-gray-900 border border-gray-800 rounded-xl p-5 hover:border-violet-600 transition-colors">
              <div className="flex items-start justify-between mb-3">
                <h2 className="font-semibold text-lg">{p.name}</h2>
                <span className={`text-xs px-2 py-1 rounded-full ${s.color}`}>{s.label}</span>
              </div>
              <p className="text-gray-400 text-sm line-clamp-2">{p.description || 'Sem descrição'}</p>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
