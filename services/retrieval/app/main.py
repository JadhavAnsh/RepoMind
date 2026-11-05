"""Minimal retrieval worker skeleton.

Only a liveness endpoint exists so the API can probe the worker. Ingestion and
retrieval routes land in later tickets.
"""

from fastapi import FastAPI

app = FastAPI(title="RepoMind Retrieval Worker")


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}
