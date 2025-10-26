from datetime import datetime
from flask_sqlalchemy import SQLAlchemy
import json

db = SQLAlchemy()


class Project(db.Model):
    """מודל פרויקט ERD"""

    __tablename__ = 'projects'

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(200), nullable=False)
    data_json = db.Column(db.Text, nullable=False, default='{}')
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def __repr__(self):
        return f'<Project {self.name}>'

    def to_dict(self):
        """המרה ל-dictionary לשליחה ל-Frontend"""
        return {
            'id': self.id,
            'name': self.name,
            'data': json.loads(self.data_json) if self.data_json else {},
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }

    @staticmethod
    def from_dict(data):
        """יצירת פרויקט מ-dictionary"""
        return Project(
            name=data.get('name', 'Untitled Project'),
            data_json=json.dumps(data.get('data', {}), ensure_ascii=False)
        )

    def update_from_dict(self, data):
        """עדכון פרויקט קיים"""
        if 'name' in data:
            self.name = data['name']
        if 'data' in data:
            self.data_json = json.dumps(data['data'], ensure_ascii=False)
        self.updated_at = datetime.utcnow()