🔴 Must fix before prod

 1. registerParticipant has no bot protection (app/routes/api.py)
 createEvent and contactParticipant verify Turnstile — registerParticipant doesn't. Its only guard is the default 100/hour/IP limit, and every registration triggers a synchronous email
 fan-out to all participants + owner. A bot can spam registrations and use your SMTP relay to blast every participant on every event. Also: no dedup (same person can register 10× for the
 same event) and no per-event participant cap.

 2. editEvent is an unvalidated mass-assignment sink (app/routes/api.py)

 ```python
   blocked = {'editToken', 'readToken', 'id'}
   updates = {k: v for k, v in data.items() if k not in blocked}
   ...setattr(event, key, value)
 ```

 No validation at all (createEvent validates, edit doesn't). Anyone with an edit token can:
 - store a garbage datePicker → frontend renders "Invalid Date"
 - store an invalid email → owner notifications silently bounce forever
 - pass latitude: "abc" or a 300-char comments → MySQL error → 500
 - pass "participants": [...] (the relationship exists) → 500
 - set eventName: "" (frontend required doesn't protect the API)

 3. Your Docker image ships your real credentials (backend Dockerfile)
 There's no .dockerignore in movewiz-backend, so COPY . . bakes stack.env (DB + SMTP passwords), the 107 MB venv/, and .git/ into the image. Anyone who can pull the image owns your database.
 (Also: python-dotenv is in requirements but never called — the file in the image is unused, it just leaks.)

 4. Rate limits are bypassable if the backend port is public (app/extensions.py)
 get_real_client_ip() takes the first X-Forwarded-For entry. Your frontend nginx doesn't proxy /api — browsers call the backend URL directly. So if port 3033 is reachable from the internet
 (the compose maps it on all interfaces), an attacker sends their own rotating X-Forwarded-For header, bypasses Cloudflare, all rate limits, and (if item 5 applies) Turnstile. The backend
 must only be reachable through your trusted proxy (or source-restricted to Cloudflare IPs), and the key func should only trust headers set by that proxy.

 5. Silent "verification skipped" is a trap (app/services.py)
 verify_turnstile returns True when TURNSTILE_SECRET_KEY is empty — with only a print. Verify for real that TURNSTILE_SECRET_KEY (backend) and VITE_TURNSTILE_SITE_KEY (frontend build arg)
 are both set in prod. Same check for CORS_ALLOWED_ORIGINS (default is *) and VITE_BACKEND_BASE_URL (baked into the JS at build time — if it's http://... and the site is HTTPS, the browser
 blocks every API call; if unset, fetch('undefined/api/...') returns the SPA's index.html and you get a mysterious JSON parse error).

 6. Synchronous email fan-out vs. gunicorn's 30 s timeout (app/services.py, Dockerfile)
 Each registration opens a new SMTP connection per recipient (connect + TLS + login, 0.5–2 s each) sequentially, inside the request. With ~20+ participants that exceeds gunicorn's default
 timeout=30 → the arbiter kills the worker mid-request: the registration is already committed, the user sees an error, in-flight emails are lost. At minimum: add --timeout 120 (and
 --access-logfile -); properly: send emails from a background thread/queue.

 🟠 Should fix

 7. validate_email() does a live DNS/MX lookup by default (app/routes/api.py → _validate_email). Every request with an email triggers a DNS query: added latency, a hard dependency on
    outbound DNS, and valid emails for domains without MX get rejected. Use validate_email(value, check_deliverability=False).
 8. [Fixed] No DB indexes on anything you query by: events.readToken/editToken, participants.contactToken/editToken/eventId (app/models.py). Every token lookup is a full table scan — fine at 100
    rows, painful at 10k.
 9. Phone 500: phoneNumber column is String(20) but neither the frontend sanitizePhone (character filter only, no truncation) nor the backend limits length → 21+ characters = "Data too long"
    = 500 on registration.
 10. MariaDB resilience: add pool_pre_ping: True to SQLALCHEMY_ENGINE_OPTIONS (DB restart → stale pooled connections → errors). Also docker-compose.yml: depends_on: service_started means a
     cold boot crash-loops until MySQL is ready (add a healthcheck + service_healthy), and the compose ships weak DB passwords in the repo — if this file is your prod stack, change those.
 11. run.py has debug=True — not used by the container (gunicorn CMD), but running python run.py in prod hands anyone a Werkzeug debug console.
 12. Flasgger /apidocs is public — full API docs for scanners. Disable it in prod.
 13. Rate limiter uses memory:// — limits reset on every deploy/restart and are per-worker if you ever scale past 1 worker. Redis-backed if you plan to grow.
 14. Client-provided URLs in emails: eventPageUrl / editParticipantPageUrl come from the browser and are pasted into every notification email. A malicious client can put a phishing URL in
     emails sent to all participants. Better to build them server-side from a FRONTEND_BASE_URL config.
 15. Frontend build skips type-checking: the Dockerfile runs npm run build-only, so vue-tsc never runs in prod builds. And npm audit shows 10 high vulns (postcss, source-map-js — build
     chain) — your TODO "fix npm audit" is real: npm audit fix.
 16. nginx: no gzip, no Cache-Control for /assets (hashed files → immutable), no security headers (X-Content-Type-Options, Referrer-Policy), no client_max_body_size.
 17. No migrations — db.create_all() at boot won't alter existing tables; your next schema change in prod needs a manual ALTER. Worth adding Alembic before the schema settles.

 🟡 Frontend bugs / UX

 18. EditEvent page submit button says "Register" — EditEvent.vue doesn't pass submit-label to FormLayout, so it falls back to $t('registerParticipant.submit'). The editEvent.submit: 'Save
     Changes' key exists but is unused.
 19. Stale event on token navigation: Event.vue reads props.token only in setup. Navigating /event?token=A → /event?token=B without unmount (back/forward between two event links) keeps
     showing A's data with B in the URL.
 20. Driver/passenger colors are swapped between surfaces: map markers + legend = driver secondary-green; participant table badge = driver primary-green. Users will be confused which green
     is which.
 21. Map re-fits on every filter keystroke: participantMarkers is derived from the filtered list, and Map.vue's watch(props) calls fitBounds on every change — typing in the name filter makes
     the map zoom/jump per keystroke. Refit only on load / new registration.
 22. Nominatim from the browser: OSM's policy is ≤1 req/s with a proper User-Agent; browsers can't set UA, so at real traffic you'll start getting 429s. Consider proxying geocoding through
     your backend. Also the search is hard-coded to France (countrycodes=fr&viewbox=...) — intentional, or a bug for anything outside FR?
 23. Minor: date input defaults to the UTC date (evening users get "tomorrow"); <html lang=""> never updates with the locale; api.ts would happily fetch undefined/api/... if the env var is
     missing at build time.

 ✅ What I checked and is fine

 - XSS: Vue auto-escaping, your manual escapeHtml() in map markers/popups, and Jinja auto-escaping in email templates — all consistent, no raw interpolation found.
 - i18n: en/fr key parity is complete (fr has 1 extra key, harmless).
 - Git hygiene: stack.env/.env were never committed in either repo's history; working trees are clean. (Untracked junk in frontend: __pycache__/, _seed_participants.py — worth gitignoring.)
 - Tokens are UUID4 (unguessable), showEmail=false is respected end-to-end, CORS + limiter are present, Leaflet icon-404 pitfall avoided (custom divIcons), multi-stage Docker build with npm
   ci on the frontend.

 One product-level note: nobody can delete anything (no event/participant/registration deletion), and if your audience is France, that plus the absence of any legal/privacy page is a GDPR
 gap for collected names, phones, addresses.

 Want me to fix the 🔴 items (1–6)? Those are a few small, contained changes: Turnstile check + dedup on register, validation on editEvent, a backend .dockerignore, XFF trust handling, and
 the gunicorn CMD flags.
