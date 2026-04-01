from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app import models
from uuid import UUID
import httpx
import os
import json

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
            headers={"Authorization": f"Bearer {PERPLEXITY_API_KEY}"},
            json={
                "model": "sonar-pro",
                "messages": [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": prompt}
                ]
            }
        )
        response.raise_for_status()
        return response.json()["choices"][0]["message"]["content"]

@router.post("/{project_id}/generate-prd")
async def generate_prd(project_id: UUID, db: Session = Depends(get_db)):
    project = db.query(models.Project).filter(models.Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Projeto não encontrado")
    log = models.PipelineLog(project_id=project_id, step="generate_prd", status="running")
    db.add(log)
    db.commit()
    try:
        prompt = f"Nome: {project.name}\nDescrição: {project.description}\nPúblico-alvo: {project.target_audience}\nStack: {project.stack}"
        prd_content = await call_perplexity(prompt, PRD_SYSTEM_PROMPT)
        existing = db.query(models.PrdVersion).filter(models.PrdVersion.project_id == project_id).count()
        version = models.PrdVersion(project_id=project_id, version=existing + 1, content_md=prd_content)
        db.add(version)
        project.status = "prd_generated"
        log.status = "success"
        log.output = f"PRD gerado com {len(prd_content)} caracteres"
        db.commit()
        return {"status": "success", "prd_version_id": str(version.id), "preview": prd_content[:500]}
    except Exception as e:
        log.status = "error"
        log.output = str(e)
        db.commit()
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/{project_id}/review")
async def review_prd(project_id: UUID, db: Session = Depends(get_db)):
    project = db.query(models.Project).filter(models.Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Projeto não encontrado")
    latest_prd = (
        db.query(models.PrdVersion)
        .filter(models.PrdVersion.project_id == project_id)
        .order_by(models.PrdVersion.version.desc())
        .first()
    )
    if not latest_prd:
        raise HTTPException(status_code=400, detail="Nenhum PRD encontrado. Gere o PRD primeiro.")
    log = models.PipelineLog(project_id=project_id, step="review_prd", status="running")
    db.add(log)
    db.commit()
    try:
        review_raw = await call_perplexity(latest_prd.content_md, REVIEWER_SYSTEM_PROMPT)
        # Extrair JSON da resposta
        start = review_raw.find('{')
        end = review_raw.rfind('}') + 1
        review_json = json.loads(review_raw[start:end])
        # Salvar score no PRD
        latest_prd.score = review_json.get("score", 0)
        project.status = "reviewed"
        log.status = "success"
        log.output = f"Score: {latest_prd.score}/100"
        db.commit()
        return {
            "score": review_json.get("score", 0),
            "approved": review_json.get("approved", False),
            "summary": review_json.get("summary", ""),
            "suggestions": review_json.get("suggestions", [])
        }
    except Exception as e:
        log.status = "error"
        log.output = str(e)
        db.commit()
        raise HTTPException(status_code=500, detail=str(e))
