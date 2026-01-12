revision = 'add_assigned_fields'
down_revision = 'new1'
branch_labels = None
depends_on = None

"""Add assigned_to_name and assigned_at to complaints

Revision ID: add_assigned_fields
Revises: new1
Create Date: 2025-12-30 00:00:00
"""

from alembic import op
import sqlalchemy as sa


def upgrade():
    op.add_column('complaints', sa.Column('assigned_to_name', sa.String(length=255), nullable=True))
    op.add_column('complaints', sa.Column('assigned_at', sa.DateTime(timezone=True), nullable=True))


def downgrade():
    op.drop_column('complaints', 'assigned_at')
    op.drop_column('complaints', 'assigned_to_name')
