import json
import logging
import smtplib
import urllib.parse
import urllib.request
from concurrent.futures import ThreadPoolExecutor
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

from flask import render_template
from .models import Event, Participant
from .config import Config

logger = logging.getLogger('movewiz')

TURNSTILE_VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify'

# Email fan-out runs off the request thread: a slow SMTP relay must not be
# able to hold a gunicorn worker past its timeout (the registration would
# be committed while the user sees a 500).
email_executor = ThreadPoolExecutor(max_workers=2, thread_name_prefix='email')


def verify_turnstile(token):
    """Verify a Cloudflare Turnstile response token server-side.

    When no secret key is configured, verification is skipped (local
    development). The skip is logged so a missing production key cannot
    silently disable bot protection.
    """
    if not Config.TURNSTILE_SECRET_KEY:
        logger.warning('TURNSTILE_SECRET_KEY not set - Turnstile verification skipped')
        return True
    if not token:
        return False

    payload = urllib.parse.urlencode({
        'secret': Config.TURNSTILE_SECRET_KEY,
        'response': token,
    }).encode()
    try:
        req = urllib.request.Request(
            TURNSTILE_VERIFY_URL,
            data=payload,
            headers={'Content-Type': 'application/x-www-form-urlencoded'},
        )
        with urllib.request.urlopen(req, timeout=10) as resp:
            result = json.loads(resp.read())
    except Exception as e:
        logger.warning(f'Error verifying Turnstile token: {e}')
        return False

    return bool(result.get('success'))


def send_email(to, subject, html):
    msg = MIMEMultipart('alternative')
    msg['From'] = Config.SMTP_FROM
    msg['To'] = to
    msg['Subject'] = subject
    msg.attach(MIMEText(html, 'html'))

    try:
        if Config.SMTP_SECURE:
            server = smtplib.SMTP_SSL(Config.SMTP_HOST, Config.SMTP_PORT)
        else:
            server = smtplib.SMTP(Config.SMTP_HOST, Config.SMTP_PORT)
            if Config.SMTP_TLS:
                server.starttls()

        if Config.SMTP_USER and Config.SMTP_PASS:
            server.login(Config.SMTP_USER, Config.SMTP_PASS)

        server.sendmail(Config.SMTP_FROM, to, msg.as_string())
        server.quit()
    except Exception as e:
        logger.warning(f'Error sending email: {e}')
    else:
        logger.info("Sending email successful")


def send_email_async(to, subject, html):
    """Send an email in a background thread (does not block the request)."""
    email_executor.submit(send_email, to, subject, html)


def notify_all(event_id, owner_email, subject, data, template, exclude_id=None):
    participants = Participant.query.filter_by(
        notifyMe=True, eventId=event_id
    )
    if exclude_id is not None:
        participants = participants.filter(Participant.id != exclude_id)
    participants = participants.all()

    # Rendering needs the app context, so it happens here (request path);
    # only the SMTP sends run in the background thread.
    html = render_template(template, **data)

    recipients = [owner_email] if owner_email else []
    recipients.extend(p.email for p in participants)

    def _send_all():
        for recipient in recipients:
            send_email(recipient, subject, html)
        logger.info(f'Emails sent to {len(recipients)} recipients.')

    email_executor.submit(_send_all)
