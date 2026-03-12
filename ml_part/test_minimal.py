from fastapi import FastAPI
import uvicorn

app = FastAPI(title="ML Test Service")

@app.get("/")
def root():
    return {"status": "ok", "message": "ML Test Service is running"}

@app.get("/health")
def health():
    return {"status": "healthy"}

if __name__ == "__main__":
    print("Starting minimal ML test service on port 8000...")
    uvicorn.run(app, host="0.0.0.0", port=8000)

