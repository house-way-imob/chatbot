#!/bin/bash
set -e

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" <<-EOSQL
  -- Bancos da aplicação
  CREATE DATABASE agencia_foto_dev;
  CREATE DATABASE agencia_foto_prod;

  -- Banco e usuário dedicado para a Evolution API
  CREATE USER evolution WITH PASSWORD 'evolution';
  CREATE DATABASE evolution OWNER evolution;
  GRANT ALL PRIVILEGES ON DATABASE evolution TO evolution;
EOSQL
