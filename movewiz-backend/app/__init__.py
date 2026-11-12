import logging

from flask import Flask
from flask_cors import CORS
from flasgger import Swagger
from .config import Config
from .extensions import db, limiter

logger = logging.getLogger('movewiz')


def _log_config_warnings():
    """Flag settings that silently weaken the app, loudly, at startup."""
    if not Config.TURNSTILE_SECRET_KEY:
        logger.warning(
            'TURNSTILE_SECRET_KEY is empty - Turnstile verification is DISABLED. '
            'Set it in production, or bot protection on registration/contact is off.'
        )
    if Config.CORS_ALLOWED_ORIGINS == '*':
        logger.warning(
            'CORS_ALLOWED_ORIGINS is "*" - any website can call this API. '
            'Restrict it to your frontend origin in production.'
        )


def create_app():
    app = Flask(__name__, template_folder='../templates')
    app.config.from_object(Config)

    _log_config_warnings()

    # Init extensions
    db.init_app(app)
    limiter.init_app(app)

    # Enable CORS
    if Config.CORS_ALLOWED_ORIGINS == '*':
        CORS(app)
    else:
        CORS(app, origins=Config.CORS_ALLOWED_ORIGINS.split(','))

    # Swagger
    swagger = Swagger(app, template={
        'swagger': '2.0',
        'info': {
            'title': 'Movewiz API',
            'version': '1.0.0',
            'description': 'API for managing events and participants',
        },
    })

    # Register blueprints
    from .routes.api import api_bp
    app.register_blueprint(api_bp)

    return app
