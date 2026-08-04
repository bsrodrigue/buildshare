"""add target_email to OneTimePassword

Revision ID: 5c1d9a3e7f42
Revises: 4b5babf792cd
Create Date: 2026-08-04 00:00:00.000000

"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "5c1d9a3e7f42"
down_revision: str | Sequence[str] | None = "4b5babf792cd"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column(
        "users_onetimepassword",
        sa.Column("target_email", sa.String(length=254), nullable=True),
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column("users_onetimepassword", "target_email")
