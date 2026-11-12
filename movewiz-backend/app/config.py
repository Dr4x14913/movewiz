import os


def _max_participants(raw):
    try:
        value = int(raw.strip())
    except (ValueError, AttributeError):
        return None
    return value if value > 0 else None


class Config:
    # CORS
    CORS_ALLOWED_ORIGINS = os.environ.get('CORS_ALLOWED_ORIGINS', '*')

    # Public origin of the frontend (e.g. https://movewiz.example.com). Used to
    # build the links embedded in notification emails. Never taken from the
    # client, so a malicious browser cannot inject phishing URLs into emails.
    FRONTEND_BASE_URL = os.environ.get('FRONTEND_BASE_URL', '').rstrip('/')

    # Database
    DB_HOST = os.environ.get('DB_HOST', 'localhost')
    DB_PORT = os.environ.get('DB_PORT', '3306')
    DB_USER = os.environ.get('DB_USER', 'root')
    DB_PASS = os.environ.get('DB_PASS', '')
    DB_NAME = os.environ.get('DB_NAME', 'movewiz')

    SQLALCHEMY_DATABASE_URI = (
        f"mysql+pymysql://{DB_USER}:{DB_PASS}@{DB_HOST}:{DB_PORT}/{DB_NAME}"
    )
    SQLALCHEMY_TRACK_MODIFICATIONS = False

    # Rate limiting - default for all endpoints, stricter limits applied per-endpoint
    RATELIMIT_DEFAULT = "100 per hour"

    # SMTP
    SMTP_HOST = os.environ.get('SMTP_HOST', 'localhost')
    SMTP_PORT = int(os.environ.get('SMTP_PORT', '587'))
    SMTP_SECURE = os.environ.get('SMTP_SECURE', 'false').lower() == 'true'
    SMTP_TLS = os.environ.get('SMTP_TLS', 'true').lower() == 'true'
    SMTP_USER = os.environ.get('SMTP_USER', '')
    SMTP_PASS = os.environ.get('SMTP_PASS', '')
    SMTP_FROM = os.environ.get('SMTP_FROM', 'no-reply@movewiz.com')

    # Cloudflare Turnstile (leave empty to skip verification, e.g. local dev)
    TURNSTILE_SECRET_KEY = os.environ.get('TURNSTILE_SECRET_KEY', '')

    # Optional cap on the number of participants per event (empty = no cap)
    MAX_PARTICIPANTS_PER_EVENT = _max_participants(os.environ.get('MAX_PARTICIPANTS_PER_EVENT', ''))
