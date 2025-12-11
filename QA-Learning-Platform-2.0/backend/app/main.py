from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
import os
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables before importing routers that might use them
load_dotenv()

from app.routers import chat
from app.routers import auth

app = FastAPI(
    title="QA Learning Platform Chat API",
    description="Chat API using OpenAI Assistants for document-based Q&A",
    version="1.0.0"
)

# CORS middleware
origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:5000",
    "http://127.0.0.1:5000",
    "*",
]
# Add Replit domain if available
replit_domain = os.getenv("REPLIT_DEV_DOMAIN")
if replit_domain:
    origins.append(f"https://{replit_domain}")

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(chat.router, prefix="/api/v1", tags=["chat"])
app.include_router(auth.router, prefix="/api/v1", tags=["auth"])

@app.get("/health")
async def health_check():
    return {"status": "healthy"}

# Serve frontend static files in production
DIST_DIR = Path(__file__).parent.parent.parent / "dist"
if DIST_DIR.exists():
    app.mount("/assets", StaticFiles(directory=DIST_DIR / "assets"), name="assets")
    
    @app.get("/{full_path:path}")
    async def serve_frontend(full_path: str):
        # For any path that's not an API route, serve index.html
        index_file = DIST_DIR / "index.html"
        if index_file.exists():
            return FileResponse(index_file)
        return {"message": "QA Learning Platform Chat API", "version": "1.0.0"}
