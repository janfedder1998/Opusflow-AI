FROM ruby:3.2-slim

# System dependencies for pg gem, gem building, and real video processing:
# ffmpeg cuts/crops clips, yt-dlp downloads source YouTube videos, python3-pip
# installs yt-dlp (not reliably available/current as a Debian package).
RUN apt-get update -qq && \
    apt-get install -y --no-install-recommends build-essential libpq-dev git ffmpeg python3-pip && \
    pip install --break-system-packages --no-cache-dir yt-dlp && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install gems first for better layer caching
COPY Gemfile ./
RUN bundle install

# Copy application code
COPY . .

# Persistent storage lives outside the app image (mounted volume in production)
RUN mkdir -p /app/storage/data /app/storage/uploads /app/storage/exports
ENV STORAGE_DIR=/app/storage

ENV PORT=4000
EXPOSE 4000

CMD ["ruby", "server.rb"]
