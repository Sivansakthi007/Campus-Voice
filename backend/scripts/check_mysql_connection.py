"""
Simple verification script to test MySQL connection using the project's backend env.

Run this from the repository root or from inside the backend folder. It will
load `backend/.env` (same as `backend/db.py`) and attempt to connect as the
`MYSQL_USER` using `pymysql`. It prints success or the error (useful for debugging
authentication issues).

Usage (from project root):
    C:\Path\To\Python314\python.exe backend\scripts\check_mysql_connection.py

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

print('Attempting connection with:')
print(f'  user={MYSQL_USER} host={MYSQL_HOST} port={MYSQL_PORT} db={MYSQL_DB}')

try:
    conn = pymysql.connect(host=MYSQL_HOST, user=MYSQL_USER, password=MYSQL_PASSWORD, port=MYSQL_PORT, database=MYSQL_DB)
    cur = conn.cursor()
    cur.execute('SELECT CURRENT_USER(), VERSION()')
    print('Connected successfully. Server info:')
    print(cur.fetchone())
    cur.close()
    conn.close()
    sys.exit(0)
except Exception as e:
    print('Connection failed:')
    print(e)
    print('\nIf this is an "Access denied" error, run the SQL to create/repair the user as an administrative user:')
    print('  scripts\\create_mysql_user.ps1    # run as administrator or provide root password')
    print('\nTo inspect the authentication plugin for the user (run as root):')
    print("  SELECT user, host, plugin FROM mysql.user WHERE user='ram' AND host='localhost';")
    sys.exit(2)
