# QA Learning Platform 2.0

## Overview

A document-based Q&A learning platform that combines a React frontend with a Python FastAPI backend. The application uses OpenAI's Assistants API with vector stores for intelligent document retrieval and answering questions about image processing concepts (primarily in Thai language). Users authenticate via Google OAuth and interact through a Gemini-style chat interface with streaming responses.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 19 with TypeScript
- **Build Tool**: Vite 6.x for development and production builds
- **Styling**: Tailwind CSS loaded via CDN with custom dark/light theme support
- **Markdown Rendering**: react-markdown with remark-gfm, remark-math, and rehype-katex for LaTeX math equations
- **Fonts**: Crimson Pro (serif), Manrope (sans-serif), JetBrains Mono (monospace)

### Backend Architecture
- **Framework**: FastAPI (Python)
- **Server**: Uvicorn with hot-reload in development
- **API Structure**: RESTful API with `/api/v1` prefix
  - `/chat` - Chat and messaging endpoints
  - `/auth` - Google OAuth authentication
  - `/sessions` - Session management
  - `/upload` - File upload handling

### AI/LLM Integration
- **Provider**: OpenAI Assistants API
- **Features Used**:
  - Threads for conversation management
  - Vector stores for document retrieval (file_search)
  - Streaming responses
  - Image analysis support
- **Required Environment Variables**:
  - `OPENAI_API_KEY` - OpenAI API key
  - `ASSISTANT_ID` - Pre-configured OpenAI Assistant ID
  - Vector store ID is hardcoded: `vs_6937893e6974819181cb9f7400fd25e9`

### Authentication
- **Method**: Google OAuth 2.0
- **Flow**: Server-side OAuth with redirect
- **Session Management**: In-memory session storage (auth_service.py)
- **Required Environment Variables**:
  - `GOOGLE_CLIENT_ID`
  - `GOOGLE_CLIENT_SECRET`
  - `OAUTH_REDIRECT_URI`

### Data Storage
- **Chat Sessions**: In-memory storage via SessionService
- **User Sessions**: In-memory storage via AuthService
- **Note**: No persistent database currently configured; sessions are lost on server restart

### Development Proxy
- Vite dev server proxies `/api` and `/health` requests to backend at `http://localhost:8000`
- Frontend runs on port 5000, backend on port 8000

## External Dependencies

### OpenAI API
- Assistants API (beta) for conversational AI
- Vector Stores for document retrieval
- File upload for document and image analysis
- Requires valid API key and pre-configured Assistant

### Google OAuth 2.0
- Used for user authentication
- Requires Google Cloud Console project with OAuth credentials configured

### CDN Dependencies
- Tailwind CSS (loaded via CDN in index.html)
- Google Fonts (Crimson Pro, Manrope, JetBrains Mono)

### Key npm Packages
- `react-markdown` - Markdown rendering
- `remark-gfm` - GitHub Flavored Markdown
- `remark-math` / `rehype-katex` - Math equation rendering
- `katex` - LaTeX rendering

### Key Python Packages
- `fastapi` - Web framework
- `uvicorn` - ASGI server
- `openai` - OpenAI SDK (>=1.0.0)
- `httpx` - HTTP client for OAuth
- `python-dotenv` - Environment variable management