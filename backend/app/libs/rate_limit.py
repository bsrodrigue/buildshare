from __future__ import annotations

import time
from collections import defaultdict
from collections.abc import Callable
from threading import Lock
from typing import Any

from fastapi import Request, Response
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint

from app.libs.errors import AppError, ErrorCode


class RateLimitStore:
    """Simple in-memory rate limit store with thread safety."""

    def __init__(self) -> None:
        self._store: dict[str, list[float]] = defaultdict(list)
        self._lock = Lock()

    def check(self, key: str, max_requests: int, window_seconds: int) -> bool:
        """Returns True if request is allowed, False if rate limited."""
        now = time.time()
        cutoff = now - window_seconds

        with self._lock:
            timestamps = self._store[key]
            # Remove expired entries
            self._store[key] = [t for t in timestamps if t > cutoff]
            if len(self._store[key]) >= max_requests:
                return False
            self._store[key].append(now)
            return True

    def get_remaining(self, key: str, max_requests: int, window_seconds: int) -> int:
        """Get remaining requests in current window."""
        now = time.time()
        cutoff = now - window_seconds

        with self._lock:
            timestamps = self._store[key]
            valid = [t for t in timestamps if t > cutoff]
            return max(0, max_requests - len(valid))

    def get_reset_time(self, key: str, window_seconds: int) -> float:
        """Get time until oldest request in window expires."""
        now = time.time()

        with self._lock:
            timestamps = self._store[key]
            if not timestamps:
                return 0.0
            oldest = min(timestamps)
            return max(0.0, oldest + window_seconds - now)


# Global rate limit store
_rate_limit_store = RateLimitStore()


def rate_limit(
    max_requests: int = 5,
    window_seconds: int = 60,
    key_func: Callable[[Request], str] | None = None,
) -> Callable[..., Any]:
    """Decorator for rate limiting endpoints.

    Args:
        max_requests: Maximum number of requests allowed in the window
        window_seconds: Time window in seconds
        key_func: Function to extract rate limit key from request.
                  Defaults to IP address.
    """

    def decorator(func: Callable[..., Any]) -> Callable[..., Any]:
        async def wrapper(request: Request, *args: Any, **kwargs: Any) -> Any:
            if key_func:
                key = key_func(request)
            else:
                # Default to client IP
                forwarded = request.headers.get("X-Forwarded-For")
                if forwarded:
                    key = forwarded.split(",")[0].strip()
                else:
                    key = request.client.host if request.client else "unknown"

            full_key = f"{func.__module__}.{func.__name__}:{key}"

            if not _rate_limit_store.check(full_key, max_requests, window_seconds):
                reset_time = _rate_limit_store.get_reset_time(full_key, window_seconds)
                raise AppError(
                    f"Trop de requêtes. Veuillez réessayer dans {int(reset_time)} secondes.",
                    ErrorCode.AUTH_RATE_LIMITED,
                )

            return await func(request, *args, **kwargs)

        return wrapper

    return decorator


class RateLimitMiddleware(BaseHTTPMiddleware):
    """Middleware for rate limiting auth endpoints."""

    def __init__(
        self,
        app: Any,
        max_requests: int = 10,
        window_seconds: int = 60,
    ) -> None:
        super().__init__(app)
        self.max_requests = max_requests
        self.window_seconds = window_seconds

    async def dispatch(self, request: Request, call_next: RequestResponseEndpoint) -> Response:
        # Only apply to auth endpoints
        if not request.url.path.startswith("/api/auth/"):
            return await call_next(request)

        # Get client IP
        forwarded = request.headers.get("X-Forwarded-For")
        if forwarded:
            client_ip = forwarded.split(",")[0].strip()
        else:
            client_ip = request.client.host if request.client else "unknown"

        full_key = f"auth_middleware:{client_ip}"

        if not _rate_limit_store.check(full_key, self.max_requests, self.window_seconds):
            reset_time = _rate_limit_store.get_reset_time(full_key, self.window_seconds)
            return JSONResponse(
                status_code=429,
                content={
                    "code": ErrorCode.AUTH_RATE_LIMITED,
                    "message": f"Trop de requêtes. Veuillez réessayer dans {int(reset_time)} secondes.",
                    "fields": {},
                },
            )

        return await call_next(request)
