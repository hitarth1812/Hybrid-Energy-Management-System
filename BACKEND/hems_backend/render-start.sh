#!/usr/bin/env bash
set -e
cd BACKEND/hems_backend
exec gunicorn hems_backend.wsgi:application --bind 0.0.0.0:$PORT --workers 2
