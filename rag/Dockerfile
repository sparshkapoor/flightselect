FROM python:3.11-slim
WORKDIR /app
COPY rag/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY rag ./rag
EXPOSE 8000
HEALTHCHECK --interval=15s --timeout=10s --retries=5 \
  CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/health')"
CMD ["uvicorn", "rag.server:app", "--host", "0.0.0.0", "--port", "8000"]
