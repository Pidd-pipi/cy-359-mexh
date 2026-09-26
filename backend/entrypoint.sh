#!/bin/sh
set -e

# 等待数据库就绪并应用迁移；Postgres 由 compose healthcheck 保证已可连接
python manage.py migrate --noinput

exec gunicorn config.wsgi:application \
  --bind 0.0.0.0:29519 \
  --workers "${GUNICORN_WORKERS:-3}" \
  --access-logfile - \
  --error-logfile -
