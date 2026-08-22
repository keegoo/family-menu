# family-menu

- Frontend: React + Vite (`client/`)
- Backend: Express (`server/`)
- Storage: SQLite (single file) + photos on disk

## Quick start

```bash
~$ npm install
~$ npm run dev
```

## Database

SQLite lives in `data/family-menu.db`.

```bash
# wipes existing data in DB and re-inserts
~$ npm run seed

# recreate from scratch
~$ rm -rf data/ && npm run seed
```
