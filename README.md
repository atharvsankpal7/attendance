attendance

## Legacy Supabase notes

This project previously used Supabase. The Supabase client and serverless functions were removed and replaced with a local Express + MongoDB backend. If you still have a local `supabase/` folder or SQL migration files, they are no longer required for the MERN backend and can be deleted.

If you still see Supabase files or a `package-lock.json` referencing `@supabase` on your machine, run these commands locally to clean up the repo:

```powershell
# Remove supabase folder (if present)
Remove-Item -Recurse -Force .\supabase

# Remove package-lock so npm can regenerate without Supabase deps
Remove-Item -Force .\package-lock.json

# Reinstall frontend deps
npm install
```

If you prefer, I can continue and try to delete those files from the repository directly — tell me if you want me to attempt that again.

## Switching to local MERN backend (already added)

This repository now includes a minimal Express + MongoDB backend under `server/` for local development.

To run the backend locally:

1. Ensure you have MongoDB running locally (or set `MONGO_URI` in your environment).
2. Start the server:

```bash
cd server
npm install
npm run dev
```

The server listens on port 4000 by default and exposes these endpoints:
- POST /api/upload — upload attendance records (expects { records, className })
- GET  /api/batches/latest — returns latest batch id
- GET  /api/analysis/:batchId — returns full analysis payload for the dashboard
- POST /api/send-defaulter-emails — simulate sending emails (accepts { defaulters })

Update your frontend `.env.local` or `.env` to set `VITE_API_BASE` if the server is running on a different host/port.
