"""add ondelete CASCADE to user foreign keys

Revision ID: a1b2c3d4e5f6
Revises: 5c1d9a3e7f42
Create Date: 2026-08-04 00:00:00.000000

"""

from collections.abc import Sequence

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "a1b2c3d4e5f6"
down_revision: str | Sequence[str] | None = "5c1d9a3e7f42"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

# (constraint name, table, column) — all reference users_user.id
USER_FK_CONSTRAINTS = [
    ("binaries_bugreport_reporter_id_fkey", "binaries_bugreport", "reporter_id"),
    ("binaries_bugmessage_user_id_fkey", "binaries_bugmessage", "user_id"),
    ("notifications_notification_user_id_fkey", "notifications_notification", "user_id"),
    ("projects_userprojectprofile_user_id_fkey", "projects_userprojectprofile", "user_id"),
    ("projects_projectinvitation_inviter_id_fkey", "projects_projectinvitation", "inviter_id"),
    ("core_taskjob_user_id_fkey", "core_taskjob", "user_id"),
    ("users_userprofile_user_id_fkey", "users_userprofile", "user_id"),
    ("users_onetimepassword_user_id_fkey", "users_onetimepassword", "user_id"),
]


def upgrade() -> None:
    for constraint, table, column in USER_FK_CONSTRAINTS:
        op.drop_constraint(constraint, table, type_="foreignkey")
        op.create_foreign_key(
            constraint,
            table,
            "users_user",
            [column],
            ["id"],
            ondelete="CASCADE",
        )


def downgrade() -> None:
    for constraint, table, column in reversed(USER_FK_CONSTRAINTS):
        op.drop_constraint(constraint, table, type_="foreignkey")
        op.create_foreign_key(
            constraint,
            table,
            "users_user",
            [column],
            ["id"],
        )
