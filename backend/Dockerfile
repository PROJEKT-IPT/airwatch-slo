FROM python:3.11-slim

RUN apt-get update && apt-get install -y --no-install-recommends curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt .
# --only-binary avoids executing arbitrary setup scripts from source dists and
# --require-hashes pins every resolved dependency by content hash for
# reproducible, supply-chain-safe builds (see the hash-locked requirements.txt).
RUN pip install --no-cache-dir --only-binary=:all: --require-hashes -r requirements.txt

COPY . .

# Run as an unprivileged user instead of root.
RUN useradd --create-home --uid 1000 appuser && chown -R appuser:appuser /app
USER appuser

EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
