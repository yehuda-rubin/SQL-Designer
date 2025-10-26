from flask import Flask, jsonify
from flask_cors import CORS
from config import Config
from models import db, Project
import os


def create_app(config_class=Config):
    """יצירת אפליקציית Flask"""
    app = Flask(__name__)
    app.config.from_object(config_class)

    # אתחול הרחבות
    db.init_app(app)
    CORS(app, origins=config_class.CORS_ORIGINS)

    # יצירת תיקיית instance אם לא קיימת
    instance_path = os.path.join(app.root_path, 'instance')
    os.makedirs(instance_path, exist_ok=True)

    # יצירת טבלאות בבסיס הנתונים
    with app.app_context():
        db.create_all()

    # רישום blueprints
    from routes.projects import projects_bp
    app.register_blueprint(projects_bp, url_prefix='/api')

    # Route בסיסי לבדיקת בריאות השרת
    @app.route('/api/health', methods=['GET'])
    def health_check():
        return jsonify({
            'success': True,
            'message': 'SQL Designer API is running',
            'version': '1.0.0'
        }), 200

    # טיפול בשגיאות 404
    @app.errorhandler(404)
    def not_found(error):
        return jsonify({
            'success': False,
            'error': 'Resource not found'
        }), 404

    # טיפול בשגיאות 500
    @app.errorhandler(500)
    def internal_error(error):
        db.session.rollback()
        return jsonify({
            'success': False,
            'error': 'Internal server error'
        }), 500

    return app


if __name__ == '__main__':
    app = create_app()
    print("🚀 SQL Designer Backend Starting...")
    print("📍 Server running on: http://localhost:5000")
    print("📡 API endpoints available at: http://localhost:5000/api")
    app.run(debug=True, host='0.0.0.0', port=5000)