from sqlalchemy import create_engine, text
import os
from dotenv import load_dotenv
from pathlib import Path

load_dotenv(Path(__file__).resolve().parents[1] / '.env')

url = os.environ.get('SQLALCHEMY_DATABASE_URL')
print('RAW URL:', url)
if url and '+asyncmy' in url:
    url = url.replace('+asyncmy', '+pymysql')
print('SYNC URL:', url)

en = create_engine(url)
with en.connect() as conn:
    res = conn.execute(text('SHOW TABLES'))
    print('TABLES:', [r for r in res])
