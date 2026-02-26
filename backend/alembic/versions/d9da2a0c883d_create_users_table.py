"""create users table

Revision ID: d9da2a0c883d
Revises: e76bf29f75ba
Create Date: 2026-02-26 16:30:12.199343

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'd9da2a0c883d'
down_revision: Union[str, Sequence[str], None] = 'e76bf29f75ba'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

def upgrade() -> None:
    op.create_table(
        "users",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("email", sa.String(length=255), nullable=False),
        sa.Column("password_hash", sa.String(length=255), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )
    op.create_index("ux_users_email", "users", ["email"], unique=True)

def downgrade() -> None:
    op.drop_index("ux_users_email", table_name="users")
    op.drop_table("users")
