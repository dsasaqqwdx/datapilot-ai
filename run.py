"""
DataPilot AI - Server Runner
Starts the FastAPI application with Uvicorn.
"""
import os
import sys
import uvicorn
from dotenv import load_dotenv

# Ensure UTF-8 output on Windows
if hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

load_dotenv()

def main():
    host = os.getenv("HOST", "127.0.0.1")
    port = int(os.getenv("PORT", 8000))

    print("\n" + "=" * 65)
    print("   DataPilot AI - Enterprise Data Engineering Studio")
    print("   AI-Assisted Modeling, Metadata Harvesting & Snowflake Deploy")
    print("=" * 65)
    print(f"\n[+] Server running at: http://{host}:{port}")
    print("[+] API Documentation at: http://{host}:{port}/docs")
    print("[+] Press Ctrl+C to stop the server.\n")

    uvicorn.run("app.main:app", host=host, port=port, reload=True)

if __name__ == "__main__":
    main()
