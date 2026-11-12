FROM python:3.12-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
    fontconfig fonts-dejavu-core \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 3000

#CMD ["python3", "/app/run.py"]
# --timeout guards against a hung request; emails are sent in background
# threads, but a slow SMTP relay must still not kill the worker mid-request.
CMD ["gunicorn", "--bind", "0.0.0.0:3000", "--workers", "1", "--timeout", "120", "--access-logfile", "-", "--error-logfile", "-", "run:app"]
