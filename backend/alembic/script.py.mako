<%!
import datetime
%>
revision = '${up_revision}'
down_revision = ${repr(down_revision)}
branch_labels = None
depends_on = None

"""Auto-generated migration

Revision ID: ${up_revision}
Revises: ${down_revision}
Create Date: ${datetime.datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S')}
"""

from alembic import op
import sqlalchemy as sa


def upgrade():
% if upgrades:
${upgrades}
% else:
    pass
% endif


def downgrade():
% if downgrades:
${downgrades}
% else:
    pass
% endif
