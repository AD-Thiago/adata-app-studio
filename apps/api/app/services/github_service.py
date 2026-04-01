import httpx
import os
import re
from typing import Optional

GITHUB_TOKEN = os.getenv("GITHUB_TOKEN", "")
GITHUB_OWNER = os.getenv("GITHUB_OWNER", "AD-Thiago")
GITHUB_API = "https://api.github.com"

HEADERS = {
    "Authorization": f"Bearer {GITHUB_TOKEN}",
    "Accept": "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
}

LABELS = [
    {"name": "feature", "color": "0ea5e9", "description": "Nova funcionalidade"},
    {"name": "bug", "color": "ef4444", "description": "Correção de bug"},
    {"name": "frontend", "color": "8b5cf6", "description": "Interface web"},
    {"name": "backend", "color": "f97316", "description": "API e servidor"},
    {"name": "infra", "color": "f59e0b", "description": "Infraestrutura"},
    {"name": "docs", "color": "10b981", "description": "Documentação"},
    {"name": "mvp", "color": "ec4899", "description": "MVP - entrega mínima"},
]

def slugify(text: str) -> str:
    text = text.lower().strip()
    text = re.sub(r'[^\w\s-]', '', text)
    text = re.sub(r'[\s_-]+', '-', text)
    return text[:50]

async def create_repository(name: str, description: str) -> dict:
    slug = slugify(name)
    async with httpx.AsyncClient(timeout=30.0) as client:
        r = await client.post(
            f"{GITHUB_API}/user/repos",
            headers=HEADERS,
            json={
                "name": slug,
                "description": description,
                "private": False,
                "auto_init": True,
                "gitignore_template": "Node",
            }
        )
        r.raise_for_status()
        data = r.json()
        return {"repo_name": slug, "repo_url": data["html_url"], "full_name": data["full_name"]}

async def create_labels(repo: str) -> None:
    async with httpx.AsyncClient(timeout=30.0) as client:
        for label in LABELS:
            await client.post(
                f"{GITHUB_API}/repos/{GITHUB_OWNER}/{repo}/labels",
                headers=HEADERS,
                json=label
            )

async def create_milestone(repo: str, title: str, description: str = "") -> int:
    async with httpx.AsyncClient(timeout=30.0) as client:
        r = await client.post(
            f"{GITHUB_API}/repos/{GITHUB_OWNER}/{repo}/milestones",
            headers=HEADERS,
            json={"title": title, "description": description}
        )
        r.raise_for_status()
        return r.json()["number"]

async def create_issue(repo: str, title: str, body: str, labels: list, milestone: Optional[int] = None) -> dict:
    async with httpx.AsyncClient(timeout=30.0) as client:
        payload = {"title": title, "body": body, "labels": labels}
        if milestone:
            payload["milestone"] = milestone
        r = await client.post(
            f"{GITHUB_API}/repos/{GITHUB_OWNER}/{repo}/issues",
            headers=HEADERS,
            json=payload
        )
        r.raise_for_status()
        data = r.json()
        return {"number": data["number"], "url": data["html_url"], "title": data["title"]}

async def extract_functional_requirements(prd_content: str) -> list[dict]:
    """Extrai os Requisitos Funcionais do PRD para criar issues."""
    issues = []
    lines = prd_content.split("\n")
    in_rf_section = False
    current_rf = None

    for line in lines:
        line_lower = line.lower()
        if any(kw in line_lower for kw in ["requisitos funcionais", "functional requirements", "## rf"]):
            in_rf_section = True
            continue
        if in_rf_section and line.startswith("## ") and "requisitos funcionais" not in line_lower:
            in_rf_section = False
            continue
        if in_rf_section:
            rf_match = re.match(r'^[-*]\s*\*{0,2}(RF\d+|\d+\.)[^:]*:\*{0,2}\s*(.*)', line)
            if rf_match:
                title = line.strip().lstrip('-* ').strip('*').strip()
                issues.append({"title": f"feat: {title[:80]}", "body": f"Gerado automaticamente a partir do PRD.\n\n**Requisito Funcional:**\n{line.strip()}", "labels": ["feature", "mvp"]})
            elif line.strip().startswith(('-', '*')) and len(line.strip()) > 5:
                title = line.strip().lstrip('-* ').strip()
                if len(title) > 10:
                    issues.append({"title": f"feat: {title[:80]}", "body": f"Gerado automaticamente a partir do PRD.\n\n{line.strip()}", "labels": ["feature"]})

    # Fallback: se não encontrou RFs específicos, cria issues genéricas
    if not issues:
        issues = [
            {"title": "feat: Setup inicial do projeto", "body": "Configurar estrutura base do projeto gerado.", "labels": ["feature", "infra"]},
            {"title": "feat: Implementar lógica de negócio principal", "body": "Desenvolver os requisitos funcionais do PRD.", "labels": ["feature", "backend"]},
            {"title": "feat: Criar interface do usuário", "body": "Desenvolver o frontend conforme especificado no PRD.", "labels": ["feature", "frontend"]},
            {"title": "docs: Documentar API e componentes", "body": "Criar documentação do projeto.", "labels": ["docs"]},
        ]
    return issues[:15]  # limitar a 15 issues

async def setup_full_project(project_name: str, description: str, prd_content: str) -> dict:
    """Pipeline completo: repo + labels + milestone + issues"""
    # 1. Criar repositório
    repo_data = await create_repository(project_name, description)
    repo = repo_data["repo_name"]

    # 2. Criar labels
    await create_labels(repo)

    # 3. Criar milestone MVP
    milestone_num = await create_milestone(repo, "MVP", "Entrega mínima viável do produto")

    # 4. Extrair e criar issues
    rf_issues = await extract_functional_requirements(prd_content)
    created_issues = []
    for issue in rf_issues:
        created = await create_issue(repo, issue["title"], issue["body"], issue["labels"], milestone_num)
        created_issues.append(created)

    return {
        "repo_name": repo,
        "repo_url": repo_data["repo_url"],
        "labels_count": len(LABELS),
        "milestone": "MVP",
        "issues_count": len(created_issues),
        "issues": created_issues,
    }
