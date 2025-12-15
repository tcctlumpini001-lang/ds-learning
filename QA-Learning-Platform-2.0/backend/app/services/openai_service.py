import os
from openai import OpenAI
from typing import List, Optional, Dict, Any, Tuple
import time
from datetime import datetime
import json
import httpx

class OpenAIService:
    def __init__(self):
        api_key = os.getenv("OPENAI_API_KEY")
        if not api_key:
            raise ValueError("OPENAI_API_KEY environment variable is not set")
        self.client = OpenAI(api_key=api_key)
        self.assistant_id = os.getenv("ASSISTANT_ID")
        if not self.assistant_id:
            raise ValueError("ASSISTANT_ID environment variable is not set")
        self.vector_store_id = "vs_6937893e6974819181cb9f7400fd25e9"

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
        """
        Send a message to a thread.
        Note: file_ids parameter is kept for compatibility but files should be 
        added to DemoVector via add_files_to_vector_store_batch() before sending.
        The Assistant will search from DemoVector directly.
        """
        # Prepare content
        content = [{"type": "text", "text": message}]
        
        # Add images to content if provided
        if image_file_ids:
            for image_id in image_file_ids:
                content.append({
                    "type": "image_file",
                    "image_file": {"file_id": image_id}
                })

        # Note: We no longer use attachments for file_search
        # Files are added to DemoVector and Assistant searches there directly
        thread_message = self.client.beta.threads.messages.create(
            thread_id=thread_id,
            role="user",
            content=content
        )
        return thread_message.id

    def upload_file(self, file_content: Any, filename: str, mime_type: Optional[str] = None) -> str:
        """
        Upload a file to OpenAI.
        Note: Files are NOT automatically added to vector store here.
        Use add_files_to_vector_store_batch() after uploading to add files to DemoVector.
        """
        # file_content should be a file-like object (bytes)
        response = self.client.files.create(
            file=(filename, file_content),
            purpose="assistants"
        )
        return response.id

    def add_files_to_vector_store_batch(
        self, 
        file_ids: List[str], 
        timeout: int = 120,
        poll_interval: int = 2
    ) -> Dict[str, Any]:
        """
        Add multiple files to the DemoVector store using OpenAI REST API.
        Waits for batch processing to complete before returning.
        
        Args:
            file_ids: List of file IDs to add to vector store
            timeout: Maximum time to wait for batch completion (seconds)
            poll_interval: Time between status checks (seconds)
            
        Returns:
            Dict with 'success', 'batch_id', 'status', and 'failed_files' info
        """
        if not file_ids:
            return {"success": True, "batch_id": None, "status": "no_files", "failed_files": 0}
        
        api_key = os.getenv("OPENAI_API_KEY")
        if not api_key:
            return {
                "success": False,
                "batch_id": None,
                "status": "error",
                "error_message": "OPENAI_API_KEY not set",
                "failed_files": len(file_ids),
                "total_files": len(file_ids)
            }
        
        try:
            headers = {
                "Authorization": f"Bearer {api_key}",
                "OpenAI-Beta": "assistants=v2"
            }
            
            # Create batch to add files to vector store using REST API
            batch_url = f"https://api.openai.com/v1/vector_stores/{self.vector_store_id}/file_batches"
            batch_data = {"file_ids": file_ids}
            
            with httpx.Client() as client:
                batch_response = client.post(batch_url, json=batch_data, headers=headers)
                
                if batch_response.status_code != 200:
                    error_detail = batch_response.text
                    print(f"Error creating batch: {batch_response.status_code} - {error_detail}")
                    return {
                        "success": False,
                        "batch_id": None,
                        "status": "error",
                        "error_message": error_detail,
                        "failed_files": len(file_ids),
                        "total_files": len(file_ids)
                    }
                
                batch_data = batch_response.json()
                batch_id = batch_data.get("id")
                
                # Poll for batch completion
                start_time = time.time()
                while time.time() - start_time < timeout:
                    retrieve_url = f"https://api.openai.com/v1/vector_stores/{self.vector_store_id}/file_batches/{batch_id}"
                    
                    batch_status_response = client.get(retrieve_url, headers=headers)
                    
                    if batch_status_response.status_code != 200:
                        print(f"Error retrieving batch status: {batch_status_response.status_code}")
                        time.sleep(poll_interval)
                        continue
                    
                    status_data = batch_status_response.json()
                    status = status_data.get("status")
                    
                    if status == "completed":
                        failed_count = status_data.get("file_counts", {}).get("failed", 0)
                        if failed_count > 0:
                            print(f"Batch {batch_id} completed with {failed_count} failed files")
                        return {
                            "success": True,
                            "batch_id": batch_id,
                            "status": status,
                            "failed_files": failed_count,
                            "total_files": len(file_ids)
                        }
                    elif status in ["failed", "cancelled"]:
                        failed_count = status_data.get("file_counts", {}).get("failed", len(file_ids))
                        print(f"Batch {batch_id} ended with status: {status}")
                        return {
                            "success": False,
                            "batch_id": batch_id,
                            "status": status,
                            "failed_files": failed_count,
                            "total_files": len(file_ids)
                        }
                    
                    # Still processing (in_progress or other)
                    time.sleep(poll_interval)
            
            # Timeout reached
            print(f"Batch {batch_id} timed out after {timeout} seconds")
            return {
                "success": False,
                "batch_id": batch_id,
                "status": "timeout",
                "failed_files": -1,
                "total_files": len(file_ids)
            }
            
        except Exception as e:
            print(f"Error adding files to vector store batch: {e}")
            import traceback
            traceback.print_exc()
            return {
                "success": False,
                "batch_id": None,
                "status": "error",
                "error_message": str(e),
                "failed_files": len(file_ids),
                "total_files": len(file_ids)
            }

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
            print(f"[SUGGESTIONS] Created thread: {thread_id}")
            
            # Prepare the prompt for generating suggestions
            prompt = """วิเคราะห์และค้นหาเนื้อหาในเอกสารทั้งหมด แล้วสร้าง 4 คำถามตัวอย่างภาษาไทยที่น่าสนใจ
แต่ละคำถามไม่เกิน 50 ตัวอักษร และตอบเป็น JSON array เท่านั้น เช่น:
["คำถาม 1", "คำถาม 2", "คำถาม 3", "คำถาม 4"]"""
            
            # Send the message to the thread with file search
            self.send_message(thread_id, prompt)
            print(f"[SUGGESTIONS] Sent prompt to thread: {thread_id}")
            
            # Create and run the assistant
            run_id = self.create_and_run(thread_id)
            print(f"[SUGGESTIONS] Created run: {run_id}")
            
            # Wait for completion (timeout 60 seconds)
            completed = self.wait_for_run_completion(thread_id, run_id, timeout=60)
            print(f"[SUGGESTIONS] Run completed: {completed}")
            
            if completed:
                response = self.get_assistant_response(thread_id)
                print(f"[SUGGESTIONS] Got response: {response}")
                
                if response:
                    try:
                        # Remove citation markers before parsing JSON
                        # Citations look like 【4:9†book310453.pdf】
                        cleaned_response = response
                        import re
                        cleaned_response = re.sub(r'【.*?†.*?】', '', cleaned_response).strip()
                        print(f"[SUGGESTIONS] Cleaned response: {cleaned_response}")
                        
                        # Try to parse JSON response
                        suggestions = json.loads(cleaned_response)
                        if isinstance(suggestions, list):
                            print(f"[SUGGESTIONS] Successfully parsed {len(suggestions)} suggestions: {suggestions}")
                            return thread_id, suggestions
                        else:
                            print(f"[SUGGESTIONS] Response is not a list: {type(suggestions)}")
                    except json.JSONDecodeError as je:
                        print(f"[SUGGESTIONS] Failed to parse suggestions JSON: {response}")
                        print(f"[SUGGESTIONS] JSON Error: {str(je)}")
                else:
                    print(f"[SUGGESTIONS] No response received from assistant")
            else:
                print(f"[SUGGESTIONS] Run did not complete within timeout")
            
            # Fallback suggestions if something goes wrong
            print(f"[SUGGESTIONS] Using fallback suggestions")
            fallback_suggestions = [
                "นิยามการประมวลผลภาพ และความสำคัญของมัน",
                "Unitary และ Fourier transform ต่างกันอย่างไร",
                "จะคำนวณสถิติภาพได้อย่างไร",
                "Sharpen Filters ใช้เพื่ออะไร"
            ]
            return thread_id, fallback_suggestions
            
        except Exception as e:
            print(f"[SUGGESTIONS] Error generating initial suggestions: {str(e)}")
            import traceback
            traceback.print_exc()
            
            # Return None for thread_id and fallback suggestions on error
            print(f"[SUGGESTIONS] Using fallback suggestions due to exception")
            fallback_suggestions = [
                "นิยามการประมวลผลภาพ และความสำคัญของมัน",
                "Unitary และ Fourier transform ต่างกันอย่างไร",
                "จะคำนวณสถิติภาพได้อย่างไร",
                "Sharpen Filters ใช้เพื่ออะไร"
            ]
            return None, fallback_suggestions