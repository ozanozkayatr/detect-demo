"""Add updated_at column to analyses."""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = "20260505_0002"
down_revision = "20260505_0001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "analyses",
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("CURRENT_TIMESTAMP"),
        ),
    )
    op.execute("UPDATE analyses SET updated_at = created_at WHERE updated_at IS NULL")
    op.alter_column("analyses", "updated_at", server_default=None)


def downgrade() -> None:
    op.drop_column("analyses", "updated_at")
