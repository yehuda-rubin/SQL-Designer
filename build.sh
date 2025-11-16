#!/usr/bin/env bash
# exit on error
set -o errexit

# Install Python dependencies
pip install --upgrade pip
pip install -r Backend/requirements.txt

# Create database tables
python Backend/init_db.py