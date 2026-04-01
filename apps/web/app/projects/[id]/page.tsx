'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'

interface Project {
  id: string
  name: string
  description?: string
  status: string
  review_score?: number
  github_repo_url?: string
  github_repo_name?: string
  created_at: string
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  draft: { label: 'Rascunho', color: 'bg-zinc-700 text-zinc-300' },
  prd_generated: { label: 'PRD Gerado', color: 'bg-blue-900 text-blue-300' },
  reviewed: { label: 'Revisado', color: 'bg-yellow-900 text-yellow-300' },
  github_created: { label: 'GitHub Criado', color: 'bg-green-900 text-green-300' },
}

export default function ProjectHubPage() {
  const params = useParams()
  const id = params.id as string
  const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

  const [project, setProject] = useState<Project | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`${API}/projects/${id}`)
      .then(r => r.json())
      .then(data => { setProject(data); setLoading(false) })
      .catch(() => setLoading(false))
  }, [id])

  if (loading) {
    return (
      <main className="max-w-3xl mx-auto px-4 py-10">
        <div className="text-zinc-400 animate-pulse">Carregando projeto...</div>
      </main>
    )
  }

  if (!project) {
    return (
      <main className="max-w-3xl mx-auto px-4 py-10">
        <p className="text-red-400">Projeto nao encontrado.</p>
        <Link href="/" className="text-blue-400 hover:underline text-sm mt-2 block">Voltar ao dashboard</Link>
      </main>
    )
  }

  const statusInfo = STATUS_LABELS[project.status] || { label: project.status, color: 'bg-zinc-700 text-zinc-300' }

  const steps = [
    {
      step: 1,
      title: 'PRD',
      description: 'Documento de Requisitos do Produto',
      href: `/projects/${id}/prd`,
      done: ['prd_generated', 'reviewed', 'github_created'].includes(project.status),
      active: project.status === 'draft',
      cta: project.status === 'draft' ? 'Gerar PRD' : 'Ver PRD',
    },
    {
      step: 2,
      title: 'Revisao',
      description: 'Avaliacao do PRD por agente revisor',
      href: `/projects/${id}/review`,
      done: ['reviewed', 'github_created'].includes(project.status),
      active: project.status === 'prd_generated',
      cta: project.status === 'reviewed' || project.status === 'github_created' ? 'Ver revisao' : 'Revisar PRD',
      badge: project.review_score != null ? `Score: ${project.review_score}/100` : undefined,
    },
    {
      step: 3,
      title: 'GitHub',
      description: 'Repositorio + labels + milestone + issues',
      href: `/projects/${id}/github`,
      done: project.status === 'github_created',
      active: project.status === 'reviewed',
      cta: project.status === 'github_created' ? 'Ver repositorio' : 'Criar no GitHub',
      badge: project.github_repo_name || undefined,
    },
  ]

  return (
    <main className="max-w-3xl mx-auto px-4 py-10">
      <div className="mb-6">
        <Link href="/" className="text-zinc-400 hover:text-white text-sm">&larr; Dashboard</Link>
      </div>

      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">{project.name}</h1>
          {project.description && (
            <p className="text-zinc-400 mt-1 text-sm max-w-xl">{project.description}</p>
          )}
        </div>
        <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${statusInfo.color}`}>
          {statusInfo.label}
        </span>
      </div>

      <div className="space-y-4">
        {steps.map((s) => (
          <div
            key={s.step}
            className={`border rounded-xl p-5 flex items-center justify-between gap-4 ${
              s.done
                ? 'border-green-700 bg-green-900/10'
                : s.active
                ? 'border-blue-600 bg-blue-900/10'
                : 'border-zinc-700 bg-zinc-900 opacity-60'
            }`}
          >
            <div className="flex items-center gap-4">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${
                s.done ? 'bg-green-600 text-white' : s.active ? 'bg-blue-600 text-white' : 'bg-zinc-700 text-zinc-400'
              }`}>
                {s.done ? '\u2713' : s.step}
              </div>
              <div>
                <p className="text-white font-medium">{s.title}</p>
                <p className="text-zinc-400 text-sm">{s.description}</p>
                {s.badge && (
                  <span className="mt-1 inline-block text-xs bg-zinc-700 text-zinc-300 px-2 py-0.5 rounded">{s.badge}</span>
                )}
              </div>
            </div>
            <Link
              href={s.href}
              className={`text-sm font-medium px-4 py-2 rounded-lg transition-colors flex-shrink-0 ${
                s.done
                  ? 'bg-zinc-700 hover:bg-zinc-600 text-white'
                  : s.active
                  ? 'bg-blue-600 hover:bg-blue-500 text-white'
                  : 'bg-zinc-800 text-zinc-500 pointer-events-none'
              }`}
            >
              {s.cta}
            </Link>
          </div>
        ))}
      </div>

      {project.github_repo_url && (
        <div className="mt-6 bg-zinc-900 border border-zinc-700 rounded-xl p-4 flex items-center justify-between">
          <div>
            <p className="text-white text-sm font-medium">Repositorio GitHub</p>
            <p className="text-zinc-400 text-xs mt-0.5">{project.github_repo_name}</p>
          </div>
          <a
            href={project.github_repo_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm bg-white text-black font-semibold px-3 py-1.5 rounded-lg hover:bg-zinc-100 transition-colors"
          >
            Abrir no GitHub
          </a>
        </div>
      )}
    </main>
  )
}
