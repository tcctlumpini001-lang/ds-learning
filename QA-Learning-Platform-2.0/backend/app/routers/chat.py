from fastapi import APIRouter, HTTPException, BackgroundTasks, UploadFile, File
from typing import List
from datetime import datetime
from app.models.chat import (
    SendMessageRequest,
    SendMessageResponse,
    CreateSessionResponse,
    DeleteSessionResponse,
    Message,
    ChatSession
)
from app.services.session_service import session_service
from app.services.openai_service import OpenAIService

router = APIRouter()
openai_service = OpenAIService()

@router.post("/sessions", response_model=CreateSessionResponse)
async def create_session():
    """Create a new chat session"""
    session = session_service.create_session()
    return CreateSessionResponse(
        session_id=session.id,
        thread_id=session.thread_id
    )

@router.delete("/sessions/{session_id}", response_model=DeleteSessionResponse)
async def delete_session(session_id: str):
    """Delete a chat session and its thread"""
    deleted = session_service.delete_session(session_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Session not found")

    return DeleteSessionResponse(
        session_id=session_id,
        deleted=deleted
    )

@router.post("/upload")
async def upload_file(file: UploadFile = File(...)):
    """Upload a file for the assistant"""
    try:
        content = await file.read()
        file_id = openai_service.upload_file(content, file.filename, file.content_type)
        
        # Determine file type
        is_image = file.content_type and file.content_type.startswith("image/")
        file_type = "image" if is_image else "file"
        
        return {
            "file_id": file_id, 
            "filename": file.filename,
            "type": file_type
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/chat", response_model=SendMessageResponse)
async def send_message(request: SendMessageRequest, background_tasks: BackgroundTasks):
    """Send a message and get assistant response"""
    try:
        session_id = request.session_id

        # Create new session if not provided
        if not session_id:
            session = session_service.create_session()
            session_id = session.id
        else:
            session = session_service.get_session(session_id)
            if not session:
                raise HTTPException(status_code=404, detail="Session not found")

        # Add user message to session
        user_message = Message(
            role="user",
            content=request.message,
            timestamp=datetime.now()
        )
        session_service.add_message_to_session(session_id, user_message)

        # Send message to OpenAI thread
        openai_service.send_message(
            session.thread_id, 
            request.message, 
            request.file_ids,
            request.image_file_ids
        )

        # Create and run the assistant

        run_id = openai_service.create_and_run(session.thread_id)

        # Wait for completion (in production, this should be async)
        if openai_service.wait_for_run_completion(session.thread_id, run_id):
            # Get assistant response
            assistant_content = openai_service.get_assistant_response(session.thread_id)

            if assistant_content:
                assistant_message = Message(
                    role="assistant",
                    content=assistant_content,
                    timestamp=datetime.now()
                )
                session_service.add_message_to_session(session_id, assistant_message)

                return SendMessageResponse(
                    session_id=session_id,
                    message=user_message,
                    assistant_response=assistant_message
                )

        # If we get here, something went wrong
        raise HTTPException(status_code=500, detail="Failed to get assistant response")
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error in send_message: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Server error: {str(e)}")

@router.get("/sessions/{session_id}/messages")
async def get_session_messages(session_id: str):
    """Get all messages from a session"""
    session = session_service.get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    return {"session_id": session_id, "messages": session.messages}

@router.get("/sessions")
async def get_all_sessions():
    """Get all active sessions"""
    sessions = session_service.get_all_sessions()
    # Convert sessions to the format expected by frontend
    formatted_sessions = []
    for session in sessions.values():
        formatted_sessions.append({
            "id": session.id,
            "thread_id": session.thread_id,
            "messages": [
                {
                    "role": msg.role,
                    "content": msg.content,
                    "timestamp": msg.timestamp.isoformat() if msg.timestamp else datetime.now().isoformat()
                }
                for msg in session.messages
            ],
            "created_at": session.created_at.isoformat(),
            "updated_at": session.updated_at.isoformat()
        })
    return {"sessions": formatted_sessions}
