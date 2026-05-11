"""add analysis persona snapshot

Revision ID: 20260511_0004
Revises: 20260505_0003
Create Date: 2026-05-11 00:00:00.000000
"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa


revision = "20260511_0004"
down_revision = "20260505_0003"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "analyses",
        sa.Column("persona_key_snapshot", sa.String(length=100), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("analyses", "persona_key_snapshot")
