from __future__ import annotations

import traceback
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles

from app.api import auth, binaries, notifications, projects
from app.config import settings
from app.landing import router as landing_router
from app.database import init_db
from app.libs.errors import AppError, ErrorCode


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    yield


app = FastAPI(
    title="BuildShare API",
    description="APK distribution platform",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(AppError)
async def app_error_handler(request: Request, exc: AppError) -> JSONResponse:
    is_not_found = "NOT_FOUND" in str(exc.code).upper()
    status_code = 404 if is_not_found else 400
    return JSONResponse(
        status_code=status_code,
        content={
            "code": exc.code,
            "message": exc.message,
            "fields": exc.extra.get("fields", {}),
        },
    )


@app.exception_handler(Exception)
async def generic_error_handler(request: Request, exc: Exception) -> JSONResponse:
    detail = str(exc) if settings.DEBUG else "Une erreur interne est survenue."
    traceback.print_exc()
    return JSONResponse(
        status_code=500,
        content={
            "code": ErrorCode.VALIDATION_ERROR,
            "message": detail,
            "fields": {},
        },
    )


app.mount("/static", StaticFiles(directory="app/static"), name="static")
app.include_router(landing_router)
app.include_router(auth.router)
app.include_router(projects.router)
app.include_router(binaries.router)
app.include_router(notifications.router)


@app.get("/api/")
async def root():
    return {"message": "BuildShare API", "version": "1.0.0"}
