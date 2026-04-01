from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
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

async def call_perplexity(prompt: str) -> str:
    async with httpx.AsyncClient(timeout=60.0) as client:
        response = await client.post(
            PERPLEXITY_API_URL,
            headers={"Authorization": f"Bearer {PERPLEXITY_API_KEY}"},
            json={
                "model": "sonar-pro",
                "messages": [
                    {"role": "system", "content": PRD_SYSTEM_PROMPT},
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
        prd_content = await call_perplexity(prompt)
        version = models.PrdVersion(project_id=project_id, version=1, content_md=prd_content)
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
