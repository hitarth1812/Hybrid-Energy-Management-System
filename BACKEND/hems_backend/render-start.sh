#!/usr/bin/env bash
set -e
cd "$(dirname "$0")"
exec python -m gunicorn --pythonpath . hems_backend.wsgi:application --bind 0.0.0.0:$PORT --workers 2
