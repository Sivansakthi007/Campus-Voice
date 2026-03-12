
import asyncio
from db import get_engine
from sqlalchemy import text

async def check_schema():
    engine = get_engine()
    async with engine.connect() as conn:
        result = await conn.execute(text("PRAGMA table_info(complaints)"))
        columns = result.fetchall()
        for col in columns:
            print(col)

if __name__ == "__main__":
    asyncio.run(check_schema())
