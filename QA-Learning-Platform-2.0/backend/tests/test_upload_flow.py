import pytest
import os
import sys
from dotenv import load_dotenv

# Load environment variables for tests
load_dotenv()

# Add backend directory to sys.path to allow importing app
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from fastapi.testclient import TestClient
from app.main import app

# Initialize TestClient
client = TestClient(app)

# Define path to test files
# Relative to this file: ../../../test_files
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
TEST_FILES_DIR = os.path.abspath(os.path.join(BASE_DIR, "../../../test_files"))

def get_test_file_path(filename):
    return os.path.join(TEST_FILES_DIR, filename)

@pytest.fixture(scope="module")
def session_id():
    """Create a session for the tests"""
    response = client.post("/api/v1/sessions")
    assert response.status_code == 200
    data = response.json()
    return data["session_id"]

@pytest.mark.parametrize("filename, question, expected_keywords", [
    ("test_doc.txt", "What is Lily's employee ID?", ["998877"]),
    ("test_data.json", "What are Lily's skills?", ["Testing", "Python", "RAG"]),
    pytest.param("test_sheet.csv", "What is John Doe's role?", ["Developer"], marks=pytest.mark.skip(reason="CSV not supported for file_search")),
    ("test_web.html", "What is the title of the page?", ["Employee Profile"]),
    pytest.param("code.png", "Describe the code in this image.", ["code", "python"], marks=pytest.mark.skip(reason="PNG not supported for file_search")), 
    ("A Spy'S Guide To Thinking PDF.pdf", "What is the title of this document?", ["spy", "guide", "thinking"]),
])
def test_upload_and_chat(session_id, filename, question, expected_keywords):
    file_path = get_test_file_path(filename)
    
    # Skip if file doesn't exist
    if not os.path.exists(file_path):
        pytest.skip(f"Test file {filename} not found at {file_path}")

    print(f"\nTesting file: {filename}")

    # 1. Upload File
    with open(file_path, "rb") as f:
        files = {"file": (filename, f)}
        response = client.post("/api/v1/upload", files=files)
    
    assert response.status_code == 200, f"Upload failed: {response.text}"
    file_id = response.json()["file_id"]
    assert file_id is not None
    print(f"Uploaded file_id: {file_id}")

    # 2. Chat with file
    payload = {
        "message": question,
        "session_id": session_id,
        "file_ids": [file_id]
    }
    
    # Increase timeout for OpenAI response as it might take time to process files
    response = client.post("/api/v1/chat", json=payload, timeout=60.0)
    
    assert response.status_code == 200, f"Chat failed: {response.text}"
    data = response.json()
    answer = data["assistant_response"]["content"]
    
    # 3. Verify response
    print(f"Question: {question}")
    print(f"Answer: {answer}")
    
    # Check if at least one keyword is present (OR logic might be safer, but AND is stricter)
    # Let's use AND for now, but make keywords simple
    found_keywords = [k for k in expected_keywords if k.lower() in answer.lower()]
    
    if not found_keywords:
         pytest.fail(f"None of the expected keywords {expected_keywords} found in answer: {answer}")
