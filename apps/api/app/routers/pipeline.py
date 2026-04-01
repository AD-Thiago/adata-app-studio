from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from app.database import get_db
from app import models
from uuid import UUID
import httpx
import os
import json
import asyncio

router = APIRouter()

PERPLEXITY_API_KEY = os.getenv("PERPLEXITY_API_KEY", "")
PERPLEXITY_API_URL = "https://api.perplexity.ai/chat/completions"

PRD_SYSTEM_PROMPT = """Você é um especialista em Product Requirements Documents (PRD).
Gere um PRD completo e estruturado em Markdown com base no briefing fornecido.
Incluá: Visão Geral, Objetivos, Público-alvo, Requisitos Funcionais, Requisitos Não-Funcionais,
Arquitetura Sugerida, Stack Tecnológica, Roadmap e Critérios de Aceitação."""

REVIEWER_SYSTEM_PROMPT = """Você é um revisor especialista de PRDs (Product Requirements Documents).
Analise o PRD fornecido e retorne EXATAMENTE um JSON válido com a seguinte estrutura:
{
  "score": <inteiro de 0 a 100>,
  "approved": <true se score >= 75>,
  "summary": "<resumo da avaliação em 1-2 frases>",
  "suggestions": ["<sugestão 1>", "<sugestão 2>", ...]
}
Critérios de avaliação: clareza dos requisitos, completude, viabilidade técnica, definição de público, critérios de aceitação."""


async def call_perplexity(prompt: str, system_prompt: str) -> str:
  async with httpx.AsyncClient(timeout=60.0) as client:
    response = await client.post(
      PERPLEXITY_API_URL,
      headers={
        "Authorization": f"Bearer {PERPLEXITY_API_KEY}",
        "Content-Type": "application/json"
      },
      json={
        "model": "sonar-pro",
        "messages": [
          {"role": "system", "content": system_prompt},
          {"role": "user", "content": prompt}
        ]
      }
    )
    response.raise_for_status()
    data = response.json()
    return data["choices"][0]["message"]["content"]


@router.post("/{project_id}/generate-prd")
async def generate_prd(project_id: str, db: Session = Depends(get_db)):
  project = db.query(models.Project).filter(models.Project.id == project_id).first()
  if not project:
    raise HTTPException(status_code=404, detail="Project not found")

  prompt = f"""Briefing do projeto: {project.name}

Descricao: {project.description or 'Sem descricao'}

Briefing completo: {project.briefing or project.description or project.name}

Gere um PRD completo e detalhado para este projeto."""

  prd_content = await call_perplexity(prompt, PRD_SYSTEM_PROMPT)

  prd = models.PrdVersion(
    project_id=project.id,
    content_md=prd_content,
    version=1
  )
  db.add(prd)
  project.status = "prd_generated"
  db.commit()
  db.refresh(prd)

  return {"prd_id": str(prd.id), "content_md": prd_content, "version": prd.version}


@router.post("/{project_id}/review")
async def review_prd(project_id: str, db: Session = Depends(get_db)):
  project = db.query(models.Project).filter(models.Project.id == project_id).first()
  if not project:
    raise HTTPException(status_code=404, detail="Project not found")

  prd = db.query(models.PrdVersion).filter(
    models.PrdVersion.project_id == project_id
  ).order_by(models.PrdVersion.version.desc()).first()

  if not prd:
    raise HTTPException(status_code=404, detail="No PRD found for this project")

  prompt = f"Revise o seguinte PRD e retorne o JSON de avaliacao:\n\n{prd.content_md}"

  review_raw = await call_perplexity(prompt, REVIEWER_SYSTEM_PROMPT)

  try:
    start = review_raw.find('{')
    end = review_raw.rfind('}') + 1
    review_json = json.loads(review_raw[start:end])
  except Exception:
    review_json = {
      "score": 70,
      "approved": False,
      "summary": "Nao foi possivel parsear a revisao automaticamente.",
      "suggestions": ["Verifique o formato do PRD e tente novamente."]
    }

  project.review_score = review_json.get("score")
  project.status = "reviewed"
  db.commit()

  return {
    "project_id": project_id,
    "prd_id": str(prd.id),
    "review": review_json
  }


@router.post("/{project_id}/create-github-repo")
async def create_github_repo(project_id: str, db: Session = Depends(get_db)):
  project = db.query(models.Project).filter(models.Project.id == project_id).first()
  if not project:
    raise HTTPException(status_code=404, detail="Project not found")

  prd = db.query(models.PrdVersion).filter(
    models.PrdVersion.project_id == project_id
  ).order_by(models.PrdVersion.version.desc()).first()

  prd_content = prd.content_md if prd else ""

  try:
    from app.services.github_service import setup_full_project
    result = await setup_full_project(
      project_name=project.name,
      description=project.description or "",
      prd_content=prd_content
    )
  except Exception as e:
    raise HTTPException(status_code=500, detail=f"GitHub pipeline failed: {str(e)}")

  project.github_repo_url = result.get("repo_url")
  project.github_repo_name = result.get("repo_name")
  project.status = "github_created"

  log = models.PipelineLog(
    project_id=project.id,
    step="create_github_repo",
    status="success",
    message=json.dumps({
      "repo_url": result.get("repo_url"),
      "issues_count": result.get("issues_count", 0)
    })
  )
  db.add(log)
  db.commit()

  return result


@router.get("/{project_id}/status")
async def pipeline_status(project_id: str, db: Session = Depends(get_db)):
  project = db.query(models.Project).filter(models.Project.id == project_id).first()
  if not project:
    raise HTTPException(status_code=404, detail="Project not found")

  logs = db.query(models.PipelineLog).filter(
    models.PipelineLog.project_id == project_id
  ).order_by(models.PipelineLog.created_at.asc()).all()

  return {
    "project_id": project_id,
    "status": project.status,
    "github_repo_url": getattr(project, 'github_repo_url', None),
    "logs": [
      {
        "step": log.step,
        "status": log.status,
        "message": log.message,
        "created_at": str(log.created_at)
      } for log in logs
    ]
  }


@router.get("/{project_id}/status/stream")
async def pipeline_status_stream(project_id: str, db: Session = Depends(get_db)):
  project = db.query(models.Project).filter(models.Project.id == project_id).first()
  if not project:
    raise HTTPException(status_code=404, detail="Project not found")

  async def event_generator():
    for _ in range(30):
      proj = db.query(models.Project).filter(models.Project.id == project_id).first()
      logs = db.query(models.PipelineLog).filter(
        models.PipelineLog.project_id == project_id
      ).order_by(models.PipelineLog.created_at.asc()).all()

      data = json.dumps({
        "status": proj.status,
        "logs": [{"step": l.step, "status": l.status, "message": l.message} for l in logs]
      })
      yield f"data: {data}\n\n"

      if proj.status in ["github_created", "error"]:
        break
      await asyncio.sleep(2)

  return StreamingResponse(event_generator(), media_type="text/event-stream")
