#!/usr/bin/env python3
"""Test script to check OpenAI SDK vector_stores availability"""

import os
from dotenv import load_dotenv

load_dotenv()

try:
    from openai import OpenAI
    
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        print("ERROR: OPENAI_API_KEY not set")
        exit(1)
    
    client = OpenAI(api_key=api_key)
    
    print("OpenAI Client initialized successfully")
    print(f"OpenAI SDK version: {OpenAI.__module__}")
    
    # Check if beta attribute exists
    print(f"\nChecking client.beta...")
    print(f"client.beta type: {type(client.beta)}")
    
    # List all attributes of beta
    beta_attrs = dir(client.beta)
    print(f"\nBeta attributes ({len(beta_attrs)} total):")
    for attr in sorted(beta_attrs):
        if not attr.startswith('_'):
            print(f"  - {attr}")
    
    # Check specifically for vector_stores
    if hasattr(client.beta, 'vector_stores'):
        print("\n✓ vector_stores attribute FOUND")
        print(f"  Type: {type(client.beta.vector_stores)}")
    else:
        print("\n✗ vector_stores attribute NOT FOUND")
        
except Exception as e:
    print(f"ERROR: {type(e).__name__}: {e}")
    import traceback
    traceback.print_exc()
