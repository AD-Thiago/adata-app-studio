from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app import models
from pydantic import BaseModel
from typing import Optional, List
from uuid import UUID

router = APIRouter()

class ProjectCreate(BaseModel):
    name: str
    target_audience: Optional[str] = None
    stack: Optional[str] = None

class ProjectOut(BaseModel):
    id: UUID
    name: str
    description: Optional[str]
    target_audience: Optional[str]
    stack: Optional[str]
    status: str
    class Config:
        from_attributes = True

@router.get("/", response_model=List[ProjectOut])
def list_projects(db: Session = Depends(get_db)):
    return db.query(models.Project).order_by(models.Project.created_at.desc()).all()

@router.get("/{project_id}", response_model=ProjectOut)
def get_project(project_id: UUID, db: Session = Depends(get_db)):
    project = db.query(models.Project).filter(models.Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Projeto não encontrado")
    return project

@router.post("/", response_model=ProjectOut, status_code=201)
def create_project(payload: ProjectCreate, db: Session = Depends(get_db)):
    project = models.Project(**payload.dict())
    db.add(project)
    db.commit()
    db.refresh(project)
    return project
