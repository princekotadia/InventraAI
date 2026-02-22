#!/usr/bin/env python3
"""
Startup script for the FastAPI backend with proper error handling
"""
import sys
import os

# Add the current directory to sys.path to ensure module imports work
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

def main():
    try:
        import uvicorn
        
        print("🚀 Starting FastAPI server on http://127.0.0.1:8000")
        print("-" * 60)
        
        uvicorn.run(
            "main:app", 
            host="127.0.0.1", 
            port=8000, 
            reload=False,  # Disable reload on Windows
            log_level="info"
        )
        
    except Exception as e:
        print(f"❌ Error starting server: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

if __name__ == "__main__":
    main()
