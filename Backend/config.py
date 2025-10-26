import os
from pathlib import Path

# Base directory of the project
BASE_DIR = Path(__file__).parent


class Config:
    """Basic application configuration"""

    # Flask settings
    SECRET_KEY = os.environ.get('SECRET_KEY') or 'dev-secret-key-change-in-production'

    # Database settings
    SQLALCHEMY_DATABASE_URI = os.environ.get('DATABASE_URL') or \
                              f'sqlite:///{BASE_DIR / "instance" / "database.db"}'
    SQLALCHEMY_TRACK_MODIFICATIONS = False

    # CORS settings
    CORS_ORIGINS = ['http://localhost:5173', 'http://127.0.0.1:5173']

    # JSON settings
    JSON_AS_ASCII = False  # Support for Unicode characters
    JSONIFY_PRETTYPRINT_REGULAR = True