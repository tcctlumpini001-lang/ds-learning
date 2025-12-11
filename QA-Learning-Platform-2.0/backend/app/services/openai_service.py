import os
from openai import OpenAI
from typing import List, Optional, Dict, Any, Tuple
import time
from datetime import datetime
import json

class OpenAIService:
    def __init__(self):
        api_key = os.getenv("OPENAI_API_KEY")
        if not api_key:
            raise ValueError("OPENAI_API_KEY environment variable is not set")
        self.client = OpenAI(api_key=api_key)
        self.assistant_id = os.getenv("ASSISTANT_ID")
        if not self.assistant_id:
            raise ValueError("ASSISTANT_ID environment variable is not set")

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

    def send_message(self, thread_id: str, message: str, file_ids: Optional[List[str]] = None, image_file_ids: Optional[List[str]] = None) -> str:
        """Send a message to a thread"""
        # Prepare content
        content = [{"type": "text", "text": message}]
        
        if image_file_ids:
            for image_id in image_file_ids:
                content.append({
                    "type": "image_file",
                    "image_file": {"file_id": image_id}
                })

        # Prepare attachments (for file search)
        attachments = []
        if file_ids:
            attachments = [
                {"file_id": file_id, "tools": [{"type": "file_search"}]}
                for file_id in file_ids
            ]
            
        thread_message = self.client.beta.threads.messages.create(
            thread_id=thread_id,
            role="user",
            content=content,
            attachments=attachments if attachments else None
        )
        return thread_message.id

    def upload_file(self, file_content: Any, filename: str) -> str:
        """Upload a file to OpenAI"""
        # file_content should be a file-like object (bytes)
        response = self.client.files.create(
            file=(filename, file_content),
            purpose="assistants"
        )
        return response.id


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
                    if hasattr(content, 'text') and content.type == "text":
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
    def generate_initial_suggestions(self) -> Tuple[Optional[str], List[str]]:
        """Generate 4 initial query suggestions based on knowledge base"""
        try:
            # Create a new thread
            thread_id = self.create_thread()
            
            # Prepare the prompt for generating suggestions
            prompt = """วิเคราะห์และค้นหาเนื้อหาในเอกสารทั้งหมด แล้วสร้าง 4 คำถามตัวอย่างภาษาไทยที่น่าสนใจ
แต่ละคำถามไม่เกิน 50 ตัวอักษร และตอบเป็น JSON array เท่านั้น เช่น:
["คำถาม 1", "คำถาม 2", "คำถาม 3", "คำถาม 4"]"""
            
            # Send the message to the thread with file search
            self.send_message(thread_id, prompt)
            
            # Create and run the assistant
            run_id = self.create_and_run(thread_id)
            
            # Wait for completion (timeout 60 seconds)
            if self.wait_for_run_completion(thread_id, run_id, timeout=60):
                response = self.get_assistant_response(thread_id)
                if response:
                    try:
                        # Remove citation markers before parsing JSON
                        # Citations look like 【4:9†book310453.pdf】
                        cleaned_response = response
                        import re
                        cleaned_response = re.sub(r'【.*?†.*?】', '', cleaned_response).strip()
                        
                        # Try to parse JSON response
                        suggestions = json.loads(cleaned_response)
                        if isinstance(suggestions, list):
                            return thread_id, suggestions
                    except json.JSONDecodeError:
                        print(f"Failed to parse suggestions JSON: {response}")
            
            # Fallback suggestions if something goes wrong
            fallback_suggestions = [
                "นิยามการประมวลผลภาพ และความสำคัญของมัน",
                "Unitary และ Fourier transform ต่างกันอย่างไร",
                "จะคำนวณสถิติภาพได้อย่างไร",
                "Sharpen Filters ใช้เพื่ออะไร"
            ]
            return thread_id, fallback_suggestions
            
        except Exception as e:
            print(f"Error generating initial suggestions: {str(e)}")
            import traceback
            traceback.print_exc()
            
            # Return None for thread_id and fallback suggestions on error
            fallback_suggestions = [
                "นิยามการประมวลผลภาพ และความสำคัญของมัน",
                "Unitary และ Fourier transform ต่างกันอย่างไร",
                "จะคำนวณสถิติภาพได้อย่างไร",
                "Sharpen Filters ใช้เพื่ออะไร"
            ]
            return None, fallback_suggestions