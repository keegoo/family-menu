#!/bin/sh
# Seed only on first boot so restarts keep cart and order stats
if [ ! -f /app/data/family-menu.db ]; then
  node /app/server/seed.js
fi
exec node /app/server/index.js
