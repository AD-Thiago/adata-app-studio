'use client'
import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'

type ReviewResult = {
  score: number
  summary: string
  suggestions: string[]
  approved: boolean
}

export default function ReviewPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [reviewing, setReviewing] = useState(false)
  const [result, setResult] = useState<ReviewResult | null>(null)
  const [error, setError] = useState('')
  const API = process.env.NEXT_PUBLIC_API_URL

  const runReview = async () => {
    setReviewing(true)
    setError('')
    try {
      const res = await fetch(`${API}/pipeline/${id}/review`, { method: 'POST' })
      const data = await res.json()
      setResult(data)
    } catch {
      setError('Erro ao executar revisão. Tente novamente.')
    } finally {
      setReviewing(false)
    }
  }

  const scoreColor = (score: number) => {
    if (score >= 80) return 'text-green-400'
    if (score >= 60) return 'text-yellow-400'
    return 'text-red-400'
  }

  const scoreBg = (score: number) => {
    if (score >= 80) return 'bg-green-900 border-green-700'
    if (score >= 60) return 'bg-yellow-900 border-yellow-700'
    return 'bg-red-900 border-red-700'
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <button onClick={() => router.push(`/projects/${id}/prd`)} className="text-gray-400 hover:text-white text-sm mb-1 block">
            ← Voltar ao PRD
          </button>
          <h1 className="text-2xl font-bold">Revisão do PRD</h1>
          <p className="text-gray-400 text-sm mt-1">O agente revisor analisa e pontua o PRD gerado.</p>
        </div>
        {!result && (
          <button onClick={runReview} disabled={reviewing}
            className="bg-violet-600 hover:bg-violet-700 disabled:bg-violet-900 text-white px-5 py-2.5 rounded-lg font-medium">
            {reviewing ? 'Revisando...' : 'Executar Revisão'}
          </button>
        )}
      </div>

      {reviewing && (
        <div className="text-center py-16">
          <div className="animate-pulse text-violet-400 text-xl mb-2">Analisando PRD...</div>
          <p className="text-gray-400 text-sm">O agente revisor está avaliando seu documento.</p>
        </div>
      )}

      {error && <div className="bg-red-900/30 border border-red-700 rounded-xl p-4 text-red-300 mb-6">{error}</div>}

      {result && (
        <div className="space-y-6">
          <div className={`border rounded-xl p-6 ${scoreBg(result.score)}`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400 mb-1">Pontuação do PRD</p>
                <p className={`text-5xl font-bold ${scoreColor(result.score)}`}>{result.score}<span className="text-2xl text-gray-400">/100</span></p>
              </div>
              <div className="text-right">
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${result.approved ? 'bg-green-800 text-green-200' : 'bg-red-800 text-red-200'}`}>
                  {result.approved ? '✅ Aprovado' : '⚠️ Revisão necessária'}
                </span>
              </div>
            </div>
            {result.summary && <p className="text-gray-300 mt-4 text-sm">{result.summary}</p>}
          </div>

          {result.suggestions?.length > 0 && (
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
              <h2 className="font-semibold mb-4 text-violet-300">Sugestões de melhoria</h2>
              <ul className="space-y-3">
                {result.suggestions.map((s, i) => (
                  <li key={i} className="flex gap-3 text-sm text-gray-300">
                    <span className="text-violet-400 mt-0.5">•</span>
                    <span>{s}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex gap-3">
            <button onClick={() => router.push(`/projects/${id}/prd`)}
              className="flex-1 border border-gray-600 hover:border-gray-400 text-gray-300 py-3 rounded-lg text-sm font-medium">
              Refinar PRD
            </button>
            <button onClick={() => router.push(`/projects/${id}/github`)}
              disabled={!result.approved}
              className="flex-1 bg-violet-600 hover:bg-violet-700 disabled:bg-gray-800 disabled:text-gray-500 text-white py-3 rounded-lg text-sm font-medium">
              Enviar para GitHub →
            </button>
          </div>
        </div>
      )}

      {!reviewing && !result && (
        <div className="text-center py-16 bg-gray-900 border border-gray-800 rounded-xl">
          <p className="text-gray-400 mb-2">Clique em "Executar Revisão" para analisar o PRD com IA.</p>
          <p className="text-gray-500 text-sm">O agente irá pontuar e sugerir melhorias.</p>
        </div>
      )}
    </div>
  )
}
