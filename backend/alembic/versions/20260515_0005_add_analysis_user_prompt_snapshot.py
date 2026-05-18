"""add analysis user prompt snapshot

Revision ID: 20260515_0005
Revises: 20260511_0004
Create Date: 2026-05-15 00:00:00.000000
"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa


revision = "20260515_0005"
down_revision = "20260511_0004"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "analyses",
        sa.Column("user_prompt_snapshot", sa.Text(), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("analyses", "user_prompt_snapshot")
