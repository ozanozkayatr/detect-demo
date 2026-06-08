"""Add users and athlete profiles for mobile app bootstrap."""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = "20260608_0006"
down_revision = "20260515_0005"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "users",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("display_name", sa.String(length=255), nullable=False),
        sa.Column("email", sa.String(length=255), nullable=True),
        sa.Column("phone_number", sa.String(length=50), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("email"),
        sa.UniqueConstraint("phone_number"),
    )
    op.create_index(op.f("ix_users_created_at"), "users", ["created_at"], unique=False)

    op.create_table(
        "athlete_profiles",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("age_range", sa.String(length=50), nullable=False),
        sa.Column("stance", sa.String(length=50), nullable=False),
        sa.Column("height_cm", sa.Integer(), nullable=True),
        sa.Column("weight_kg", sa.Integer(), nullable=True),
        sa.Column("experience_level", sa.String(length=100), nullable=False),
        sa.Column("years_boxing", sa.Integer(), nullable=True),
        sa.Column("weekly_training_days", sa.Integer(), nullable=True),
        sa.Column("training_types", sa.JSON(), nullable=False),
        sa.Column("routine_summary", sa.Text(), nullable=False),
        sa.Column("has_amateur_bouts", sa.Boolean(), nullable=False),
        sa.Column("has_professional_experience", sa.Boolean(), nullable=False),
        sa.Column("has_coaching_experience", sa.Boolean(), nullable=False),
        sa.Column("limitations", sa.Text(), nullable=False),
        sa.Column("additional_context", sa.Text(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("user_id"),
    )
    op.create_index(
        op.f("ix_athlete_profiles_created_at"),
        "athlete_profiles",
        ["created_at"],
        unique=False,
    )
    op.create_index(
        op.f("ix_athlete_profiles_user_id"),
        "athlete_profiles",
        ["user_id"],
        unique=True,
    )


def downgrade() -> None:
    op.drop_index(op.f("ix_athlete_profiles_user_id"), table_name="athlete_profiles")
    op.drop_index(
        op.f("ix_athlete_profiles_created_at"), table_name="athlete_profiles"
    )
    op.drop_table("athlete_profiles")

    op.drop_index(op.f("ix_users_created_at"), table_name="users")
    op.drop_table("users")
