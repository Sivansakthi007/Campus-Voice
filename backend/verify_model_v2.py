
import asyncio
from models import Complaint

async def verify():
    cols = Complaint.__table__.columns.keys()
    print(f"Columns: {cols}")
    if "escalation_level" in cols and "last_escalation_at" in cols:
        print("SUCCESS: Escalation columns found in model.")
    else:
        print("FAILURE: Escalation columns missing from model.")

if __name__ == "__main__":
    asyncio.run(verify())
