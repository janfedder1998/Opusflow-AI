FROM ruby:3.2-slim

# System dependencies for sqlite3 gem + gem building
RUN apt-get update -qq && \
    apt-get install -y --no-install-recommends build-essential libsqlite3-dev git && \
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
