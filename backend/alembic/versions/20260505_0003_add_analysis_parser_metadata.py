"""Add parser metadata columns to analyses."""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = "20260505_0003"
down_revision = "20260505_0002"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "analyses",
        sa.Column("parser_strategy", sa.String(length=50), nullable=True),
    )
    op.add_column(
        "analyses",
        sa.Column("json_parse_succeeded", sa.Boolean(), nullable=True),
    )
    op.add_column(
        "analyses",
        sa.Column("template_key_snapshot", sa.String(length=100), nullable=True),
    )
    op.execute(
        """
        UPDATE analyses
        SET template_key_snapshot = prompt_templates.key
        FROM prompt_templates
        WHERE analyses.prompt_template_id = prompt_templates.id
          AND analyses.template_key_snapshot IS NULL
        """
    )


def downgrade() -> None:
    op.drop_column("analyses", "template_key_snapshot")
    op.drop_column("analyses", "json_parse_succeeded")
    op.drop_column("analyses", "parser_strategy")
