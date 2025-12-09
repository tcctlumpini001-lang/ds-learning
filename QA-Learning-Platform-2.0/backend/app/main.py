from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import os
from dotenv import load_dotenv
from app.routers import chat
from app.routers import auth

# Load environment variables
load_dotenv()

app = FastAPI(
    title="QA Learning Platform Chat API",
    description="Chat API using OpenAI Assistants for document-based Q&A",
    version="1.0.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],  # Frontend URLs
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(chat.router, prefix="/api/v1", tags=["chat"])
app.include_router(auth.router, prefix="/api/v1", tags=["auth"])

@app.get("/")
async def root():
    return {"message": "QA Learning Platform Chat API", "version": "1.0.0"}

@app.get("/health")
async def health_check():
    return {"status": "healthy"}
