# Build stage
FROM rust:1.83-slim as builder

WORKDIR /app

# Install build dependencies
RUN apt-get update && apt-get install -y \
    pkg-config \
    libssl-dev \
    && rm -rf /var/lib/apt/lists/*

# Copy manifests
COPY Cargo.toml ./

# Copy source code
COPY src ./src

# Build both binaries
RUN cargo build --release --bin server && \
    cargo build --release --bin seed_admin

# Runtime stage
FROM debian:bookworm-slim

WORKDIR /app

# Install runtime dependencies
RUN apt-get update && apt-get install -y \
    ca-certificates \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy the binaries from builder
COPY --from=builder /app/target/release/server /app/server
COPY --from=builder /app/target/release/seed_admin /app/seed_admin

# Create necessary directories with proper permissions
RUN mkdir -p /data /uploads && chmod 777 /data /uploads

# Copy environment file template
COPY .env.docker /app/.env

# Expose port
EXPOSE 3000

# Run the binary
CMD ["/app/server"]
