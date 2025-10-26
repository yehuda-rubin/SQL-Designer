from flask import Blueprint, request, jsonify
from models import db, Project
from sqlalchemy.exc import SQLAlchemyError

projects_bp = Blueprint('projects', __name__)


@projects_bp.route('/projects', methods=['GET'])
def get_projects():
    """קבלת רשימת כל הפרויקטים"""
    try:
        projects = Project.query.order_by(Project.updated_at.desc()).all()
        return jsonify({
            'success': True,
            'projects': [p.to_dict() for p in projects]
        }), 200
    except SQLAlchemyError as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@projects_bp.route('/projects/<int:project_id>', methods=['GET'])
def get_project(project_id):
    """קבלת פרויקט בודד לפי ID"""
    try:
        project = Project.query.get_or_404(project_id)
        return jsonify({
            'success': True,
            'project': project.to_dict()
        }), 200
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 404


@projects_bp.route('/projects', methods=['POST'])
def create_project():
    """יצירת פרויקט חדש"""
    try:
        data = request.get_json()

        if not data or 'name' not in data:
            return jsonify({
                'success': False,
                'error': 'Project name is required'
            }), 400

        project = Project.from_dict(data)
        db.session.add(project)
        db.session.commit()

        return jsonify({
            'success': True,
            'project': project.to_dict(),
            'message': 'Project created successfully'
        }), 201

    except SQLAlchemyError as e:
        db.session.rollback()
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@projects_bp.route('/projects/<int:project_id>', methods=['PUT'])
def update_project(project_id):
    """עדכון פרויקט קיים"""
    try:
        project = Project.query.get_or_404(project_id)
        data = request.get_json()

        if not data:
            return jsonify({
                'success': False,
                'error': 'No data provided'
            }), 400

        project.update_from_dict(data)
        db.session.commit()

        return jsonify({
            'success': True,
            'project': project.to_dict(),
            'message': 'Project updated successfully'
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@projects_bp.route('/projects/<int:project_id>', methods=['DELETE'])
def delete_project(project_id):
    """מחיקת פרויקט"""
    try:
        project = Project.query.get_or_404(project_id)
        db.session.delete(project)
        db.session.commit()

        return jsonify({
            'success': True,
            'message': 'Project deleted successfully'
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500