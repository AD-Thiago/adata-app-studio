'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

const STACKS = ['Next.js + FastAPI', 'Next.js + Node.js', 'React + Django', 'Vue + Laravel', 'Personalizada']

export default function NewProjectPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    name: '',
    description: '',
    target_audience: '',
    stack: '',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name || !form.target_audience) {
      setError('Nome e público-alvo são obrigatórios.')
      return
    }
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/projects`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (!res.ok) throw new Error('Erro ao criar projeto')
      const data = await res.json()
      router.push(`/projects/${data.id}/prd`)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido')
      setLoading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-2">Novo Projeto</h1>
      <p className="text-gray-400 mb-8">Preencha o briefing para gerar o PRD com IA.</p>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-medium mb-1">Nome do produto <span className="text-red-400">*</span></label>
          <input
            type="text" placeholder="Ex: Sistema de Laudo de Candidatos"
            className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 focus:outline-none focus:border-violet-500"
            value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Público-alvo <span className="text-red-400">*</span></label>
          <input
            type="text" placeholder="Ex: RHs de empresas de médio porte"
            className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 focus:outline-none focus:border-violet-500"
            value={form.target_audience} onChange={e => setForm({ ...form, target_audience: e.target.value })}
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Objetivo principal</label>
          <textarea
            rows={4} placeholder="Descreva o problema que o produto resolve..."
            className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 focus:outline-none focus:border-violet-500"
            value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Stack preferida</label>
          <select
            className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 focus:outline-none focus:border-violet-500"
            value={form.stack} onChange={e => setForm({ ...form, stack: e.target.value })}
          >
            <option value="">Selecionar (opcional)</option>
            {STACKS.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        {error && <p className="text-red-400 text-sm">{error}</p>}
        <button
          type="submit" disabled={loading}
          className="w-full bg-violet-600 hover:bg-violet-700 disabled:bg-violet-900 text-white py-3 rounded-lg font-medium transition-colors"
        >
          {loading ? 'Gerando PRD...' : 'Gerar PRD com IA'}
        </button>
      </form>
    </div>
  )
}
