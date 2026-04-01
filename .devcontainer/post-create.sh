#!/bin/bash
set -e

echo "========================================"
echo "  AData App Studio - Codespace Setup"
echo "========================================"

# ---- Workspace ----
cd /workspace

# ---- Python / Backend ----
echo ""
echo "[1/5] Instalando dependencias do backend..."
cd /workspace/apps/api
pip install --upgrade pip --quiet
pip install -r requirements.txt --quiet
echo "  Backend: OK"

# ---- Alembic migrations ----
echo ""
echo "[2/5] Aguardando PostgreSQL e rodando migrations..."
for i in {1..15}; do
  if pg_isready -h db -U adata -d adata_studio -q 2>/dev/null; then
    echo "  PostgreSQL: pronto"
    break
  fi
  echo "  Aguardando PostgreSQL ($i/15)..."
  sleep 3
done

export DATABASE_URL="postgresql://adata:adata@db:5432/adata_studio"
alembic upgrade head && echo "  Migrations: OK" || echo "  Migrations: falhou (verifique o DB)"

# ---- Node / Frontend ----
echo ""
echo "[3/5] Instalando dependencias do frontend..."
cd /workspace/apps/web
npm install --legacy-peer-deps --silent
echo "  Frontend: OK"

# ---- .env files ----
echo ""
echo "[4/5] Configurando variaveis de ambiente..."
cd /workspace

if [ ! -f apps/api/.env ]; then
  cat > apps/api/.env << 'EOF'
DATABASE_URL=postgresql://adata:adata@db:5432/adata_studio
PERPLEXITY_API_KEY=
GITHUB_TOKEN=
GITHUB_OWNER=AD-Thiago
EOF
  echo "  Criado apps/api/.env (preencha PERPLEXITY_API_KEY e GITHUB_TOKEN)"
else
  echo "  apps/api/.env ja existe"
fi

if [ ! -f apps/web/.env.local ]; then
  cat > apps/web/.env.local << 'EOF'
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_APP_NAME=AData App Studio
EOF
  echo "  Criado apps/web/.env.local"
else
  echo "  apps/web/.env.local ja existe"
fi

# ---- Aliases uteis ----
echo ""
echo "[5/5] Configurando aliases..."
cat >> ~/.bashrc << 'EOF'

# AData App Studio aliases
alias api='cd /workspace/apps/api && uvicorn main:app --host 0.0.0.0 --port 8000 --reload'
alias web='cd /workspace/apps/web && npm run dev'
alias migrate='cd /workspace/apps/api && alembic upgrade head'
alias logs-api='cd /workspace/apps/api && uvicorn main:app --host 0.0.0.0 --port 8000 --reload 2>&1'
export DATABASE_URL="postgresql://adata:adata@db:5432/adata_studio"
export PYTHONPATH="/workspace/apps/api"
EOF
echo "  Aliases: api | web | migrate"

echo ""
echo "========================================"
echo "  Setup completo!"
echo "========================================"
echo ""
echo "  Para iniciar:"
echo "    Terminal 1: api    # backend :8000"
echo "    Terminal 2: web    # frontend :3000"
echo ""
echo "  IMPORTANTE: Preencha as chaves em apps/api/.env"
echo "    PERPLEXITY_API_KEY=<sua-chave>"
echo "    GITHUB_TOKEN=<seu-token>"
echo ""
