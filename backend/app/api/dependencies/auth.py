from __future__ import annotations

from functools import lru_cache
from typing import Any

from clerk_backend_api import authenticate_request
from clerk_backend_api.models import EmailAddress, PhoneNumber
from clerk_backend_api.sdk import Clerk
from clerk_backend_api.security.types import (
    AuthStatus,
    AuthenticateRequestOptions,
)
from fastapi import Depends, Request
from sqlalchemy.orm import Session

from app.api.errors import api_error
from app.core.config import settings
from app.db.session import get_db
from app.models.user import User
from app.services.app_session_service import (
    ClerkIdentity,
    get_user_by_clerk_id,
    upsert_user_from_clerk_identity,
)


def _auth_error_message(reason: Any) -> str:
    if reason is None:
        return "Authentication is required."
    if (
        hasattr(reason, "value")
        and isinstance(reason.value, tuple)
        and len(reason.value) > 1
    ):
        return str(reason.value[1])
    return "Authentication is required."


def _pick_primary_email(
    email_addresses: list[EmailAddress],
    primary_email_address_id: str | None,
) -> str | None:
    for email_address in email_addresses:
        if email_address.id == primary_email_address_id:
            return email_address.email_address
    return email_addresses[0].email_address if email_addresses else None


def _pick_primary_phone(
    phone_numbers: list[PhoneNumber],
    primary_phone_number_id: str | None,
) -> str | None:
    for phone_number in phone_numbers:
        if phone_number.id == primary_phone_number_id:
            return phone_number.phone_number
    return phone_numbers[0].phone_number if phone_numbers else None


def _build_display_name(
    *,
    clerk_user_id: str,
    first_name: str | None = None,
    last_name: str | None = None,
    username: str | None = None,
    email: str | None = None,
    phone_number: str | None = None,
) -> str:
    full_name = " ".join(
        part.strip() for part in [first_name, last_name] if part and part.strip()
    )
    if full_name:
        return full_name
    if username and username.strip():
        return username.strip()
    if email and email.strip():
        return email.split("@", 1)[0].replace(".", " ").replace("_", " ").strip().title()
    if phone_number and phone_number.strip():
        return f"Athlete {phone_number[-4:]}"
    return f"Athlete {clerk_user_id[-6:]}"


def _identity_from_payload(payload: dict[str, Any], clerk_user_id: str) -> ClerkIdentity:
    email = payload.get("email")
    phone_number = payload.get("phone_number")
    return ClerkIdentity(
        clerk_user_id=clerk_user_id,
        display_name=_build_display_name(
            clerk_user_id=clerk_user_id,
            first_name=payload.get("first_name"),
            last_name=payload.get("last_name"),
            username=payload.get("username"),
            email=email if isinstance(email, str) else None,
            phone_number=phone_number if isinstance(phone_number, str) else None,
        ),
        email=email if isinstance(email, str) else None,
        phone_number=phone_number if isinstance(phone_number, str) else None,
    )


def _identity_from_clerk(clerk_user_id: str) -> ClerkIdentity | None:
    if not settings.clerk_secret_key:
        return None

    try:
        clerk_user = get_clerk_client().users.get(user_id=clerk_user_id)
    except Exception:
        return None

    email = _pick_primary_email(
        clerk_user.email_addresses,
        clerk_user.primary_email_address_id,
    )
    phone_number = _pick_primary_phone(
        clerk_user.phone_numbers,
        clerk_user.primary_phone_number_id,
    )
    return ClerkIdentity(
        clerk_user_id=clerk_user.id,
        display_name=_build_display_name(
            clerk_user_id=clerk_user.id,
            first_name=clerk_user.first_name,
            last_name=clerk_user.last_name,
            username=clerk_user.username,
            email=email,
            phone_number=phone_number,
        ),
        email=email,
        phone_number=phone_number,
    )


@lru_cache
def get_clerk_client() -> Clerk:
    return Clerk(bearer_auth=settings.clerk_secret_key)


def get_current_user(
    request: Request,
    db: Session = Depends(get_db),
) -> User:
    if not settings.clerk_configured:
        raise api_error(
            status_code=503,
            code="auth_not_configured",
            message="Clerk authentication is not configured on the backend.",
        )

    try:
        request_state = authenticate_request(
            request,
            AuthenticateRequestOptions(
                secret_key=settings.clerk_secret_key,
                jwt_key=settings.clerk_jwt_key,
                authorized_parties=settings.clerk_authorized_parties or None,
                accepts_token=["session_token"],
            ),
        )
    except Exception:
        raise api_error(
            status_code=503,
            code="auth_verification_failed",
            message="Clerk session verification is temporarily unavailable.",
        ) from None

    if request_state.status != AuthStatus.SIGNED_IN or not request_state.payload:
        raise api_error(
            status_code=401,
            code="authentication_required",
            message=_auth_error_message(request_state.reason),
        )

    clerk_user_id = str(request_state.payload.get("sub") or "").strip()
    if not clerk_user_id:
        raise api_error(
            status_code=401,
            code="authentication_required",
            message="Authenticated session did not include a user identity.",
        )

    user = get_user_by_clerk_id(db, clerk_user_id)
    should_sync_from_clerk = user is None or not user.email or user.display_name.startswith(
        "Athlete "
    )

    if should_sync_from_clerk:
        identity = _identity_from_clerk(clerk_user_id) or _identity_from_payload(
            request_state.payload,
            clerk_user_id,
        )
        user = upsert_user_from_clerk_identity(db, identity)
        db.commit()
        db.refresh(user)

    if user is None:
        raise api_error(
            status_code=500,
            code="user_resolution_failed",
            message="Authenticated user could not be resolved locally.",
        )

    return user
