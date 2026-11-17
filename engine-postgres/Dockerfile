FROM postgres:16-alpine

# Copiar scripts de inicialización DDL y seeds
COPY init/ /docker-entrypoint-initdb.d/

HEALTHCHECK --interval=5s --timeout=5s --retries=5 \
  CMD pg_isready -U ${POSTGRES_USER:-agent_user} -d ${POSTGRES_DB:-agent_db} || exit 1

