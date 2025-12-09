import uuid
from typing import Dict, Optional
from datetime import datetime
from app.models.chat import ChatSession, Message
from app.services.openai_service import OpenAIService

class SessionService:
    def __init__(self):
        self.sessions: Dict[str, ChatSession] = {}
        self.openai_service = OpenAIService()

    def create_session(self) -> ChatSession:
        """Create a new chat session with a new thread"""
        session_id = str(uuid.uuid4())
        thread_id = self.openai_service.create_thread()

        session = ChatSession(
            id=session_id,
            thread_id=thread_id,
            messages=[],
            created_at=datetime.now(),
            updated_at=datetime.now()
        )

        self.sessions[session_id] = session
        return session

    def get_session(self, session_id: str) -> Optional[ChatSession]:
        """Get a session by ID"""
        return self.sessions.get(session_id)

    def delete_session(self, session_id: str) -> bool:
        """Delete a session and its thread"""
        session = self.sessions.get(session_id)
        if session:
            # Delete the OpenAI thread
            thread_deleted = self.openai_service.delete_thread(session.thread_id)

            # Remove from memory
            del self.sessions[session_id]
            return thread_deleted

        return False

    def add_message_to_session(self, session_id: str, message: Message) -> bool:
        """Add a message to a session"""
        session = self.sessions.get(session_id)
        if session:
            session.messages.append(message)
            session.updated_at = datetime.now()
            return True
        return False

    def get_all_sessions(self) -> Dict[str, ChatSession]:
        """Get all sessions"""
        return self.sessions

# Global instance
session_service = SessionService()
