FROM python:3.10-slim

ENV PYTHONUNBUFFERED=1
WORKDIR /app

# Install system dependencies required by opencv / dlib / ffmpeg
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential cmake git ffmpeg libopenblas-dev liblapack-dev \
    libx11-6 libgl1-mesa-glx libglib2.0-0 libsm6 libxext6 libgtk2.0-0 \
  && rm -rf /var/lib/apt/lists/*

# Copy requirements and install Python deps
COPY requirements.txt /app/requirements.txt
RUN pip install --upgrade pip
RUN pip install --no-cache-dir -r /app/requirements.txt

# Copy application code
COPY . /app

ENV PORT=5001
EXPOSE 5001

CMD ["python", "app.py"]
