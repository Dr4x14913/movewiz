import ipaddress

from flask import request
from flask_sqlalchemy import SQLAlchemy
from flask_limiter import Limiter

db = SQLAlchemy()

# Direct peers whose X-Forwarded-For header is trusted: loopback (local
# dev) and the private ranges Docker bridge networks are allocated from.
# A client that reaches the backend port directly is not in these ranges,
# so its own X-Forwarded-For header can never spoof the rate-limit key.
_TRUSTED_PROXY_NETS = (
    ipaddress.ip_network('127.0.0.0/8'),
    ipaddress.ip_network('::1/128'),
    ipaddress.ip_network('172.16.0.0/12'),
)


def _is_trusted_proxy(address: str) -> bool:
    try:
        ip = ipaddress.ip_address(address)
    except ValueError:
        return False
    return any(ip in network for network in _TRUSTED_PROXY_NETS)


def get_real_client_ip():
    """Return the real client IP behind a reverse proxy.

    X-Forwarded-For (first entry = original client) is only honoured when
    the direct peer is a trusted proxy; otherwise the raw remote address
    is used so the header cannot be spoofed by direct clients.
    """
    remote = request.remote_addr or ''
    if _is_trusted_proxy(remote):
        forwarded_for = request.headers.get('X-Forwarded-For')
        if forwarded_for:
            first = forwarded_for.split(',')[0].strip()
            if first:
                return first
    return remote


limiter = Limiter(key_func=get_real_client_ip, storage_uri="memory://")
