#!/bin/bash
set -e

# Creates the dedicated Evolution API database and user.
# The main app database (api_housewayimob) is already created by POSTGRES_DB.
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" <<-EOSQL
  CREATE USER evolution WITH PASSWORD 'evolution';
  CREATE DATABASE evolution OWNER evolution;
  GRANT ALL PRIVILEGES ON DATABASE evolution TO evolution;
EOSQL
