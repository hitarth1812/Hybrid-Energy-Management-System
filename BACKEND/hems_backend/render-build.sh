#!/usr/bin/env bash
set -o errexit

# Navigate to the Django project directory
cd BACKEND/hems_backend

pip install -r requirements.txt
python manage.py collectstatic --no-input
python manage.py migrate
