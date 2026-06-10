"""Add Clerk identity and user ownership to uploaded videos."""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = "20260609_0007"
down_revision = "20260608_0006"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "users",
        sa.Column("clerk_user_id", sa.String(length=255), nullable=True),
    )
    op.execute(
        """
        UPDATE users
        SET clerk_user_id = CONCAT('legacy-user-', id)
        WHERE clerk_user_id IS NULL
        """
    )
    op.alter_column("users", "clerk_user_id", nullable=False)
    op.create_index(
        op.f("ix_users_clerk_user_id"),
        "users",
        ["clerk_user_id"],
        unique=True,
    )

    op.add_column("videos", sa.Column("user_id", sa.Integer(), nullable=True))
    op.execute(
        """
        INSERT INTO users (display_name, email, phone_number, created_at, updated_at, clerk_user_id)
        SELECT
            'Legacy Demo User',
            NULL,
            NULL,
            TIMEZONE('utc', now()),
            TIMEZONE('utc', now()),
            'legacy-demo-user'
        WHERE EXISTS (SELECT 1 FROM videos)
          AND NOT EXISTS (
              SELECT 1
              FROM users
              WHERE clerk_user_id = 'legacy-demo-user'
          )
        """
    )
    op.execute(
        """
        UPDATE videos
        SET user_id = legacy_user.id
        FROM users AS legacy_user
        WHERE videos.user_id IS NULL
          AND legacy_user.clerk_user_id = 'legacy-demo-user'
        """
    )
    op.alter_column("videos", "user_id", nullable=False)
    op.create_index(op.f("ix_videos_user_id"), "videos", ["user_id"], unique=False)
    op.create_foreign_key(
        "fk_videos_user_id_users",
        "videos",
        "users",
        ["user_id"],
        ["id"],
    )


def downgrade() -> None:
    op.drop_constraint("fk_videos_user_id_users", "videos", type_="foreignkey")
    op.drop_index(op.f("ix_videos_user_id"), table_name="videos")
    op.drop_column("videos", "user_id")

    op.drop_index(op.f("ix_users_clerk_user_id"), table_name="users")
    op.drop_column("users", "clerk_user_id")
