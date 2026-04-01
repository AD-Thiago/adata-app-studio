from sqlalchemy import Column, String, Text, DateTime, Integer, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.database import Base
import uuid
from datetime import datetime

class Project(Base):
    __tablename__ = "projects"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(255), nullable=False)
    description = Column(Text)
    briefing = Column(Text)
    target_audience = Column(Text)
    stack = Column(String(255))
    status = Column(String(50), default="draft")  # draft, prd_generated, reviewed, github_created
    review_score = Column(Integer)
    github_repo_url = Column(String(500))
    github_repo_name = Column(String(255))
    created_at = Column(DateTime, default=datetime.utcnow)
    prd_versions = relationship("PrdVersion", back_populates="project")
    pipeline_logs = relationship("PipelineLog", back_populates="project")

class PrdVersion(Base):
    __tablename__ = "prd_versions"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id"))
    version = Column(Integer, default=1)
    content_md = Column(Text)
    score = Column(Integer)
    created_at = Column(DateTime, default=datetime.utcnow)
    project = relationship("Project", back_populates="prd_versions")

class PipelineLog(Base):
    __tablename__ = "pipeline_logs"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id"))
    step = Column(String(100))
    status = Column(String(50))
    message = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)
    project = relationship("Project", back_populates="pipeline_logs")
