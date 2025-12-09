import os
from openai import OpenAI
from typing import List, Optional, Dict, Any
import time
from datetime import datetime

class OpenAIService:
    def __init__(self):
        self.client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
        self.assistant_id = os.getenv("ASSISTANT_ID")

    def create_thread(self, initial_messages: Optional[List[Dict[str, Any]]] = None) -> str:
        """Create a new thread, optionally with initial messages"""
        if initial_messages:
            thread = self.client.beta.threads.create(messages=initial_messages)
        else:
            thread = self.client.beta.threads.create()
        return thread.id

    def delete_thread(self, thread_id: str) -> bool:
        """Delete a thread"""
        try:
            response = self.client.beta.threads.delete(thread_id)
            return response.deleted
        except Exception as e:
            print(f"Error deleting thread {thread_id}: {e}")
            return False

    def send_message(self, thread_id: str, message: str) -> str:
        """Send a message to a thread"""
        thread_message = self.client.beta.threads.messages.create(
            thread_id=thread_id,
            role="user",
            content=message
        )
        return thread_message.id

    def create_and_run(self, thread_id: str) -> str:
        """Create a run for the assistant on the thread"""
        run = self.client.beta.threads.runs.create(
            thread_id=thread_id,
            assistant_id=self.assistant_id
        )
        return run.id

    def wait_for_run_completion(self, thread_id: str, run_id: str, timeout: int = 60) -> bool:
        """Wait for a run to complete"""
        start_time = time.time()
        while time.time() - start_time < timeout:
            run = self.client.beta.threads.runs.retrieve(
                thread_id=thread_id,
                run_id=run_id
            )

            if run.status == "completed":
                return True
            elif run.status in ["failed", "cancelled", "expired"]:
                print(f"Run {run_id} ended with status: {run.status}")
                return False

            time.sleep(1)

        print(f"Run {run_id} timed out")
        return False

    def get_assistant_response(self, thread_id: str) -> Optional[str]:
        """Get the latest assistant response from the thread"""
        messages = self.client.beta.threads.messages.list(thread_id=thread_id)

        for message in messages.data:
            if message.role == "assistant":
                # Get the text content
                for content in message.content:
                    if content.type == "text":
                        return content.text.value
        return None

    def get_thread_messages(self, thread_id: str) -> List[Dict[str, Any]]:
        """Get all messages from a thread"""
        messages = self.client.beta.threads.messages.list(thread_id=thread_id)
        return [
            {
                "id": msg.id,
                "role": msg.role,
                "content": msg.content[0].text.value if msg.content else "",
                "created_at": datetime.fromtimestamp(msg.created_at)
            }
            for msg in messages.data
        ]
