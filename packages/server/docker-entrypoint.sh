#!/bin/sh
set -e
node dist/config/migrate.js
exec node dist/index.js
