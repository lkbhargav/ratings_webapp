#!/bin/bash

# Script to initialize admin user in Docker container
# Usage: ./scripts/init-admin.sh [username] [password]

set -e

USERNAME=${1:-admin}
PASSWORD=${2:-admin123}

echo "Creating admin user: $USERNAME"

# Wait for backend to be ready
echo "Waiting for backend to be ready..."
sleep 5

# Execute seed_admin in the container
docker exec -it media-ranking-backend /app/seed_admin --username "$USERNAME" --password "$PASSWORD"

echo "Admin user created successfully!"
echo "You can now login at http://localhost:5173/admin/login"
echo "Username: $USERNAME"
