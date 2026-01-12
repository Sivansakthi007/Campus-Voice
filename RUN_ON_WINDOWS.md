Windows setup and run steps

Prerequisites
- Install Python 3.14 and note its full path (example used in this repo):
  C:\Users\ADMIN\AppData\Local\Programs\Python\Python314\python.exe
- Install Node.js (recommended LTS) and npm.

1) Open PowerShell (normal user is fine) and change to the project root.

2) Run the provided setup script to remove the old .venv, recreate it with Python 3.14, and install Python dependencies:

```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass -Force
.\scripts\setup_backend_env.ps1
```

If your Python executable is in a different location, pass it explicitly:

```powershell
.\scripts\setup_backend_env.ps1 -PythonPath 'C:\Path\To\Your\Python314\python.exe'
```

3) Install frontend Node dependencies and build/dev run:

```powershell
cd Frontend
npm install
npm run dev
# or to run production-like build:
# npm run build; npm start
```

4) Start the backend (from project root):

```powershell
# Uses the Python path embedded in backend/package.json and root start:uvicorn
npm --prefix backend start
# or from root:
npm run start:uvicorn
```

Notes
- The backend is configured to run uvicorn on host 127.0.0.1 port 8000.
- The frontend defaults to `http://localhost:8000` if `NEXT_PUBLIC_API_URL` is not set, so it will connect to the backend started above.
- If you prefer to run Python commands manually:

```powershell
# Activate venv
. .\.venv\Scripts\Activate.ps1
# Then run
python -m uvicorn backend.server:app --reload --app-dir . --host 127.0.0.1 --port 8000
```

If anything fails, check that the Python path passed to the setup script points to Python 3.14. Adjust the path in `backend/package.json` and `package.json` if necessary for other systems.

Database user / authentication troubleshooting

- If you get an "Access denied for user 'ram'@'localhost'" error, create or fix the MySQL user and grant privileges by running the SQL in `sql/create_ram_user.sql` as an administrative MySQL user (for example `root`).

Run the provided helper (PowerShell) which uses the `mysql` CLI:

```powershell
# You will be prompted for the root password if you don't pass it
.\scripts\create_mysql_user.ps1 -RootUser root
# Or provide the root password on the command line (note: visible in process list)
.\scripts\create_mysql_user.ps1 -RootUser root -RootPassword 'your_root_password'
```

After creating the user, verify connectivity using the included Python script:

```powershell
C:\Users\ADMIN\AppData\Local\Programs\Python\Python314\python.exe backend\scripts\check_mysql_connection.py
```

If verification fails with an authentication plugin mismatch, run (as root) to inspect the plugin:

```sql
SELECT user, host, plugin FROM mysql.user WHERE user='ram' AND host='localhost';
```

If the `plugin` value is `caching_sha2_password` and your client cannot use it, alter the user to use `mysql_native_password` instead:

```sql
ALTER USER 'ram'@'localhost' IDENTIFIED WITH mysql_native_password BY 'ram@2005';
FLUSH PRIVILEGES;
```

