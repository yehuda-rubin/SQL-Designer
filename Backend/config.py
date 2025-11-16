import os
from pathlib import Path

# Base directory of the project
BASE_DIR = Path(__file__).parent


class Config:
    """Basic application configuration"""

    # Flask settings
    SECRET_KEY = os.environ.get('SECRET_KEY') or 'dev-secret-key-change-in-production'

    # Database settings
    # In production (Render), DATABASE_URL will be provided automatically
    database_url = os.environ.get('DATABASE_URL')
    
    # Render uses postgres:// but SQLAlchemy needs postgresql://
    if database_url and database_url.startswith('postgres://'):
        database_url = database_url.replace('postgres://', 'postgresql://', 1)
    
    SQLALCHEMY_DATABASE_URI = database_url or \
                              f'sqlite:///{BASE_DIR / "instance" / "database.db"}'
    SQLALCHEMY_TRACK_MODIFICATIONS = False

    # CORS settings - Updated for production
    # Get FRONTEND_URL from environment variable (set in Render)
    FRONTEND_URL = os.environ.get('FRONTEND_URL', 'http://localhost:5173')
    
    CORS_ORIGINS = [
        'http://localhost:5173',
        'http://127.0.0.1:5173',
        FRONTEND_URL,  # Your production frontend URL
        'https://*.onrender.com'  # Allow all Render subdomains during development
    ]

    # JSON settings
    JSON_AS_ASCII = False  # Support for Unicode characters
    JSONIFY_PRETTYPRINT_REGULAR = True