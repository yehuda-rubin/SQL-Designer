from flask import Blueprint, request, jsonify
from models import db, Project
from sqlalchemy.exc import SQLAlchemyError

projects_bp = Blueprint('projects', __name__)


@projects_bp.route('/projects', methods=['GET'])
def get_projects():
    """Get a list of all projects"""
    try:
        # Query all projects, ordered by most recently updated
        projects = Project.query.order_by(Project.updated_at.desc()).all()
        return jsonify({
            'success': True,
            'projects': [p.to_dict() for p in projects]
        }), 200
    except SQLAlchemyError as e:
        # Handle database errors
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@projects_bp.route('/projects/<int:project_id>', methods=['GET'])
def get_project(project_id):
    """Get a single project by ID"""
    try:
        # Retrieve the project, or raise 404 if not found
        project = Project.query.get_or_404(project_id)
        return jsonify({
            'success': True,
            'project': project.to_dict()
        }), 200
    except Exception as e:
        # Handle not found (404) or other exceptions
        return jsonify({
            'success': False,
            'error': str(e)
        }), 404


@projects_bp.route('/projects', methods=['POST'])
def create_project():
    """Create a new project"""
    try:
        data = request.get_json()

        # Input validation
        if not data or 'name' not in data:
            return jsonify({
                'success': False,
                'error': 'Project name is required'
            }), 400

        # Create, add, and commit the new project
        project = Project.from_dict(data)
        db.session.add(project)
        db.session.commit()

        return jsonify({
            'success': True,
            'project': project.to_dict(),
            'message': 'Project created successfully'
        }), 201

    except SQLAlchemyError as e:
        # Rollback on database error and return 500
        db.session.rollback()
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@projects_bp.route('/projects/<int:project_id>', methods=['PUT'])
def update_project(project_id):
    """Update an existing project"""
    try:
        # Retrieve the project
        project = Project.query.get_or_404(project_id)
        data = request.get_json()

        # Input validation
        if not data:
            return jsonify({
                'success': False,
                'error': 'No data provided'
            }), 400

        # Update and commit the changes
        project.update_from_dict(data)
        db.session.commit()

        return jsonify({
            'success': True,
            'project': project.to_dict(),
            'message': 'Project updated successfully'
        }), 200

    except Exception as e:
        # Rollback on error (could be 404 or DB error)
        db.session.rollback()
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@projects_bp.route('/projects/<int:project_id>', methods=['DELETE'])
def delete_project(project_id):
    """Delete a project"""
    try:
        # Retrieve and delete the project
        project = Project.query.get_or_404(project_id)
        db.session.delete(project)
        db.session.commit()

        return jsonify({
            'success': True,
            'message': 'Project deleted successfully'
        }), 200

    except Exception as e:
        # Rollback on error
        db.session.rollback()
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500
