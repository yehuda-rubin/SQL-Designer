"""
Database initialization script for production deployment
"""
import sys
import os

# Add Backend directory to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'Backend'))

from app import create_app
from models import db

def init_database():
    """Initialize database tables"""
    app = create_app()
    
    with app.app_context():
        # Create all tables
        db.create_all()
        print("✅ Database tables created successfully!")

if __name__ == '__main__':
    init_database()