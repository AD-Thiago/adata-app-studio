'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import ReactMarkdown from 'react-markdown'

type PrdVersion = { id: string; version: number; content_md: string; score: number | null }
type Project = { id: string; name: string; status: string; prd_versions?: PrdVersion[] }

export default function PrdPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [project, setProject] = useState<Project | null>(null)
  const [prd, setPrd] = useState<PrdVersion | null>(null)
  const [editing, setEditing] = useState(false)
  const [editContent, setEditContent] = useState('')
  const [generating, setGenerating] = useState(false)
  const [loading, setLoading] = useState(true)
  const API = process.env.NEXT_PUBLIC_API_URL

  useEffect(() => {
    fetch(`${API}/projects/${id}`)
      .then(r => r.json())
      .then(data => {
        setProject(data)
        if (data.prd_versions?.length > 0) {
          const latest = data.prd_versions.sort((a: PrdVersion, b: PrdVersion) => b.version - a.version)[0]
          setPrd(latest)
          setEditContent(latest.content_md)
        }
        setLoading(false)
      })
  }, [id, API])

  const generatePrd = async () => {
    setGenerating(true)
    const res = await fetch(`${API}/pipeline/${id}/generate-prd`, { method: 'POST' })
    const data = await res.json()
    if (data.status === 'success') {
      window.location.reload()
    } else {
      setGenerating(false)
    }
  }

  if (loading) return <div className="text-center py-20 text-gray-400">Carregando...</div>
  if (!project) return <div className="text-center py-20 text-red-400">Projeto não encontrado</div>

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <button onClick={() => router.push('/')} className="text-gray-400 hover:text-white text-sm mb-1 block">← Voltar
          </button>
          <h1 className="text-2xl font-bold">{project.name}</h1>
        </div>
        <div className="flex gap-3">
          {prd && (
            <>
              <button onClick={() => { setEditing(!editing); setEditContent(prd.content_md) }}
                className="border border-gray-600 hover:border-gray-400 text-gray-300 px-4 py-2 rounded-lg text-sm">
                {editing ? 'Cancelar' : 'Editar PRD'}
              </button>
              <button onClick={() => router.push(`/projects/${id}/review`)}
                className="bg-violet-600 hover:bg-violet-700 text-white px-4 py-2 rounded-lg text-sm font-medium">
                Revisar PRD →
              </button>
            </>
          )}
          {!prd && (
            <button onClick={generatePrd} disabled={generating}
              className="bg-violet-600 hover:bg-violet-700 disabled:bg-violet-900 text-white px-4 py-2 rounded-lg text-sm font-medium">
              {generating ? 'Gerando PRD...' : 'Gerar PRD com IA'}
            </button>
          )}
        </div>
      </div>

      {prd && (
        <div className="mb-2 flex items-center gap-3">
          <span className="text-xs bg-blue-900 text-blue-300 px-2 py-1 rounded-full">Versão {prd.version}</span>
          {prd.score && <span className="text-xs bg-green-900 text-green-300 px-2 py-1 rounded-full">Score {prd.score}/100</span>}
        </div>
      )}

      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
        {!prd && !generating && (
          <div className="text-center py-10 text-gray-400">
            <p className="mb-4">Nenhum PRD gerado ainda.</p>
          </div>
        )}
        {generating && (
          <div className="text-center py-10">
            <div className="animate-pulse text-violet-400 text-lg">Gerando PRD com IA...</div>
            <p className="text-gray-400 text-sm mt-2">Isso pode levar alguns segundos.</p>
          </div>
        )}
        {prd && editing && (
          <textarea
            className="w-full bg-gray-950 text-gray-100 font-mono text-sm p-4 rounded-lg min-h-[500px] focus:outline-none focus:ring-1 focus:ring-violet-500"
            value={editContent}
            onChange={e => setEditContent(e.target.value)}
          />
        )}
        {prd && !editing && (
          <article className="prose prose-invert prose-violet max-w-none">
            <ReactMarkdown>{prd.content_md}</ReactMarkdown>
          </article>
        )}
      </div>
    </div>
  )
}
