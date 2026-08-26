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

## Backup & Restore

Download everything (database + photos) as one zip:

```bash
~$ curl -OJ http://localhost:3000/api/backup && unzip -l family-menu-backup-*.zip
``` 

The file is named `family-menu-backup-<timestamp>.zip` and contains `family-menu.db` plus the `uploads/` folder.

To restore on another machine, unzip it into `data/`:

```bash
~$ git clone <repo> && cd family-menu
~$ npm install
~$ mkdir -p data && unzip ~/Downloads/family-menu-backup-20260826T224200.zip -d data/
~$ npm run dev
```
