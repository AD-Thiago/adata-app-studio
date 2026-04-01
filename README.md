# AData App Studio

> Plataforma end-to-end de geração de aplicações via agentes de IA
> **briefing → PRD → revisão → arquitetura → repositório GitHub**

---

## Visão Geral

O AData App Studio permite gerar aplicações completas a partir de um simples briefing, utilizando uma cadeia de agentes de IA (Perplexity) orquestrados por um backend FastAPI, com uma interface web em Next.js 14.

## Arquitetura

```
[Interface Web - Next.js 14]
       |
       | HTTP/REST
       v
[Orquestrador - FastAPI]
   |         |         |
   v         v         v
[Agente  [Agente  [Agente
  PRD]   Revisor] Arquiteto]
             |
    [Perplexity Spaces API]
             |
             v
    [GitHub API / Computer]
             |
             v
    [Repo + Issues + Board]
```

## Stack

| Camada | Tecnologia |
|---|---|
| Frontend | Next.js 14 + Tailwind CSS + shadcn/ui |
| Backend | FastAPI (Python) |
| Banco de Dados | PostgreSQL |
| Agentes de IA | Perplexity Spaces API (sonar-pro) |
| Deploy Frontend | Vercel |
| Deploy Backend | Railway |
| Controle de Versão | GitHub |

## Estrutura de Pastas

```
adata-app-studio/
├── apps/
│   ├── api/                    # Backend FastAPI
│   │   ├── main.py
│   │   ├── requirements.txt
│   │   └── app/
│   │       ├── database.py     # SQLAlchemy setup
│   │       ├── models.py       # Project, PrdVersion, PipelineLog
│   │       └── routers/
│   │           ├── projects.py # CRUD de projetos
│   │           └── pipeline.py # Orquestração dos agentes
│   └── web/                    # Frontend Next.js
│       ├── package.json
│       └── app/
│           ├── layout.tsx      # Layout global + navbar
│           ├── page.tsx        # Dashboard de projetos
│           └── new/
│               └── page.tsx    # Formulário de briefing
├── .env.example
├── .gitignore
└── README.md
```

## Fluxo End-to-End

1. Usuário preenche o briefing em `/new`
2. Frontend chama `POST /projects` no backend
3. Orquestrador chama o Agente PRD (Perplexity API)
4. PRD é salvo no banco como `PrdVersion v1`
5. Usuário vê o PRD em `/projects/{id}/prd`
6. Aciona o Revisor → score + sugestões
7. Loop de refinamento até score satisfatório
8. Aciona criação do repo GitHub com issues e board

## Como Rodar Localmente

### Pré-requisitos
- Python 3.11+
- Node.js 18+
- PostgreSQL rodando localmente
- Chave de API Perplexity

### Backend
```bash
cd apps/api
pip install -r requirements.txt
cp ../../.env.example .env  # preencher variáveis
uvicorn main:app --reload --port 8000
```

### Frontend
```bash
cd apps/web
npm install
cp ../../.env.example .env.local  # preencher NEXT_PUBLIC_API_URL
npm run dev
```

Acesse: `http://localhost:3000`

## Roadmap

| Semana | Foco | Status |
|---|---|---|
| Semana 1 | Fundação (repo, banco, API base, UI base) | 🟡 Em andamento |
| Semana 2 | Integração Agente PRD + Revisor na UI | ⏳ Pendente |
| Semana 3 | Pipeline GitHub + Status em tempo real | ⏳ Pendente |
| Semana 4 | Agente Arquitetura + caso real end-to-end | ⏳ Pendente |

## Variáveis de Ambiente

Consulte o arquivo `.env.example` na raiz do repositório para ver todas as variáveis necessárias.

---

Desenvolvido por [AD-Thiago](https://github.com/AD-Thiago) — AData AI
