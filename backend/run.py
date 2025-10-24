# backend/run.py
import uvicorn

if __name__ == "__main__":
    uvicorn.run(
        "app.main:app",  # The import string for your app
        host="127.0.0.1",
        port=8000,
        reload=True      # Enable auto-reloading
    )