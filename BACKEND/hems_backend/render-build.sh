#!/usr/bin/env bash
set -o errexit

# Navigate to backend directory (works from repo root or if already in backend)
if [ ! -f "requirements.txt" ]; then
    cd BACKEND/hems_backend
fi

pip install -r requirements.txt
python manage.py collectstatic --no-input
python manage.py migrate
