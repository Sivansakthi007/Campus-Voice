"""
Check if `complaints` table exists and whether it contains any rows.
Run from repo root: python backend/scripts/check_complaints_table.py
"""
import os
import sys
from pathlib import Path
from dotenv import load_dotenv

repo_root = Path(__file__).resolve().parents[2]
backend_dir = repo_root / 'backend'
env_path = backend_dir / '.env'
if env_path.exists():
    load_dotenv(env_path)

import pymysql

MYSQL_USER = os.environ.get('MYSQL_USER', 'ram')
MYSQL_PASSWORD = os.environ.get('MYSQL_PASSWORD', 'ram@2005')
MYSQL_HOST = os.environ.get('MYSQL_HOST', 'localhost')
MYSQL_PORT = int(os.environ.get('MYSQL_PORT', '3306'))
MYSQL_DB = os.environ.get('MYSQL_DB', 'campus_voice_db')

print('Connecting to DB to inspect `complaints` table...')
try:
    conn = pymysql.connect(host=MYSQL_HOST, user=MYSQL_USER, password=MYSQL_PASSWORD, port=MYSQL_PORT, database=MYSQL_DB)
    cur = conn.cursor()
    try:
        cur.execute("SELECT COUNT(*) FROM complaints")
        cnt = cur.fetchone()[0]
        print(f"Table `complaints` exists. Row count: {cnt}")
        if cnt > 0:
            cur.execute("SELECT id, title, created_at FROM complaints ORDER BY created_at DESC LIMIT 5")
            rows = cur.fetchall()
            print('Recent rows (up to 5):')
            for r in rows:
                print(r)
        cur.close()
        conn.close()
        sys.exit(0)
    except Exception as e:
        print('Error querying `complaints` table (may not exist):')
        print(e)
        cur.close()
        conn.close()
        sys.exit(2)
except Exception as e:
    print('Connection failed:')
    print(e)
    sys.exit(3)
