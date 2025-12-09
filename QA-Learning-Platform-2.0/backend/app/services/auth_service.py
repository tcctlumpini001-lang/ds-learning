import uuid
from typing import Dict, Optional

class AuthService:
    def __init__(self):
        # Simple in-memory store mapping session_id -> user info
        self.sessions: Dict[str, dict] = {}

    def create_user_session(self, user_info: dict) -> str:
        session_id = str(uuid.uuid4())
        self.sessions[session_id] = user_info
        return session_id

    def get_user_by_session(self, session_id: str) -> Optional[dict]:
        return self.sessions.get(session_id)

    def delete_session(self, session_id: str) -> bool:
        if session_id in self.sessions:
            del self.sessions[session_id]
            return True
        return False

# global instance
auth_service = AuthService()
