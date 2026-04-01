from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.database import engine, Base
from app.routers import projects, pipeline

Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="AData App Studio API",
    description="Orquestrador de agentes de IA para geração de aplicações",
    version="0.1.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(projects.router, prefix="/projects", tags=["projects"])
app.include_router(pipeline.router, prefix="/pipeline", tags=["pipeline"])

@app.get("/health")
def health_check():
    return {"status": "ok", "service": "adata-app-studio-api"}
