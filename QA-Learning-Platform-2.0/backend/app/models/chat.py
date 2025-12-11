from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime

class Message(BaseModel):
    role: str  # "user" or "assistant"
    content: str
    timestamp: Optional[datetime] = None

class ChatSession(BaseModel):
    id: str
    thread_id: str
    messages: List[Message] = []
    created_at: datetime
    updated_at: datetime

class SendMessageRequest(BaseModel):
    message: str
    session_id: Optional[str] = None  # If None, create new session
    file_ids: Optional[List[str]] = None

class SendMessageResponse(BaseModel):
    session_id: str
    message: Message
    assistant_response: Optional[Message] = None

class CreateSessionResponse(BaseModel):
    session_id: str
    thread_id: str

class DeleteSessionResponse(BaseModel):
    session_id: str
    deleted: bool
