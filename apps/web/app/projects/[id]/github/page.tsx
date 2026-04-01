'use client'

import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'

interface GitHubResult {
  repo_name: string
  repo_url: string
  labels_count: number
  milestone: string
  issues_count: number
  issues: Array<{ title: string; url?: string; number?: number }>
}

export default function GitHubPage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string
  const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<GitHubResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [logs, setLogs] = useState<string[]>([])

  const appendLog = (msg: string) => setLogs(prev => [...prev, msg])

  const handleCreate = async () => {
    setLoading(true)
    setError(null)
    setLogs([])
    appendLog('Iniciando criacao do repositorio GitHub...')

    try {
      appendLog('Chamando pipeline de criacao...')
      const res = await fetch(`${API}/pipeline/${id}/create-github-repo`, {
        method: 'POST',
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.detail || 'Erro ao criar repositorio')
      }

      const data: GitHubResult = await res.json()
      appendLog(`Repositorio criado: ${data.repo_url}`)
      appendLog(`Labels criadas: ${data.labels_count}`)
      appendLog(`Milestone: ${data.milestone}`)
      appendLog(`Issues criadas: ${data.issues_count}`)
      setResult(data)
    } catch (err: any) {
      setError(err.message)
      appendLog(`Erro: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="max-w-3xl mx-auto px-4 py-10">
      <div className="mb-6">
        <Link href={`/projects/${id}`} className="text-zinc-400 hover:text-white text-sm">
          &larr; Voltar ao projeto
        </Link>
      </div>

      <h1 className="text-2xl font-bold text-white mb-2">Pipeline GitHub</h1>
      <p className="text-zinc-400 mb-8">
        Crie automaticamente o repositorio GitHub com labels, milestone MVP e issues geradas a partir do PRD.
      </p>

      {!result && (
        <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-6 mb-6">
          <h2 className="text-lg font-semibold text-white mb-3">O que sera criado:</h2>
          <ul className="space-y-2 text-zinc-300 text-sm">
            <li className="flex items-center gap-2"><span className="text-green-400">+</span> Repositorio GitHub publico</li>
            <li className="flex items-center gap-2"><span className="text-green-400">+</span> Labels padrao (feature, backend, frontend, infra, docs, bug)</li>
            <li className="flex items-center gap-2"><span className="text-green-400">+</span> Milestone MVP</li>
            <li className="flex items-center gap-2"><span className="text-green-400">+</span> Issues extraidas dos Requisitos Funcionais do PRD</li>
          </ul>

          <button
            onClick={handleCreate}
            disabled={loading}
            className="mt-6 w-full bg-green-600 hover:bg-green-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-lg transition-colors"
          >
            {loading ? 'Criando repositorio...' : 'Criar repositorio no GitHub'}
          </button>

          {error && (
            <div className="mt-4 bg-red-900/40 border border-red-700 rounded-lg p-3 text-red-300 text-sm">
              {error}
            </div>
          )}
        </div>
      )}

      {logs.length > 0 && (
        <div className="bg-black border border-zinc-700 rounded-xl p-4 mb-6 font-mono text-sm">
          <p className="text-zinc-500 text-xs mb-2">LOG</p>
          {logs.map((log, i) => (
            <p key={i} className="text-green-400">&gt; {log}</p>
          ))}
        </div>
      )}

      {result && (
        <div className="space-y-4">
          <div className="bg-green-900/20 border border-green-700 rounded-xl p-6">
            <h2 className="text-xl font-bold text-green-400 mb-1">Repositorio criado com sucesso!</h2>
            <p className="text-zinc-300 text-sm mb-4">Seu projeto esta no GitHub com tudo configurado.</p>

            <a
              href={result.repo_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-white text-black font-semibold px-4 py-2 rounded-lg hover:bg-zinc-100 transition-colors text-sm"
            >
              Abrir no GitHub &rarr;
            </a>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-4 text-center">
              <p className="text-3xl font-bold text-white">{result.labels_count}</p>
              <p className="text-zinc-400 text-sm mt-1">Labels</p>
            </div>
            <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-4 text-center">
              <p className="text-3xl font-bold text-white">1</p>
              <p className="text-zinc-400 text-sm mt-1">Milestone</p>
            </div>
            <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-4 text-center">
              <p className="text-3xl font-bold text-white">{result.issues_count}</p>
              <p className="text-zinc-400 text-sm mt-1">Issues</p>
            </div>
          </div>

          <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-6">
            <h3 className="text-white font-semibold mb-3">Issues criadas</h3>
            <ul className="space-y-2">
              {result.issues.map((issue, i) => (
                <li key={i} className="flex items-start gap-2 text-sm">
                  <span className="text-zinc-500 mt-0.5">#{issue.number || i + 1}</span>
                  {issue.url ? (
                    <a href={issue.url} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">
                      {issue.title}
                    </a>
                  ) : (
                    <span className="text-zinc-300">{issue.title}</span>
                  )}
                </li>
              ))}
            </ul>
          </div>

          <div className="flex gap-3 pt-2">
            <Link
              href={`/projects/${id}`}
              className="flex-1 text-center bg-zinc-800 hover:bg-zinc-700 text-white font-medium py-2 rounded-lg transition-colors text-sm"
            >
              Ver projeto
            </Link>
          </div>
        </div>
      )}
    </main>
  )
}
