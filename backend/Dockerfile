FROM python:3.11-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq-dev gcc postgresql-client && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

RUN chmod +x /app/entrypoint.sh

EXPOSE 8000

ENTRYPOINT ["./entrypoint.sh"]
# single worker + threads: DRF throttle counters are in process memory
CMD ["gunicorn", "wedding_backend.wsgi:application", "--bind", "0.0.0.0:8000", "--workers", "1", "--threads", "8", "--timeout", "60", "--access-logfile", "-"]
