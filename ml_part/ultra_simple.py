#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""Ultra Simple ML Service - No DB dependency"""

import uvicorn
from fastapi import FastAPI

print("="*60)
print("Ultra Simple ML Service (No DB)")
print("="*60)

app = FastAPI(title="Ultra Simple ML")

@app.get("/")
def root():
    return {"status": "running", "message": "Ultra simple ML service"}

@app.get("/health")
def health():
    return {"status": "healthy"}

@app.get("/test")
def test():
    return {"test": "ok", "service": "ml"}

if __name__ == "__main__":
    print("\nStarting on port 8000...")
    print("="*60)
    uvicorn.run(app, host="0.0.0.0", port=8000)

