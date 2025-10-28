# Docker Setup Guide

This guide explains how to run the Media Ranking System using Docker and Docker Compose.

## Prerequisites

- **Docker** (v20.10+): Install from https://docs.docker.com/get-docker/
- **Docker Compose** (v2.0+): Usually included with Docker Desktop

Verify installation:
```bash
docker --version
docker-compose --version
```

## Quick Start (Recommended)

### 1. Build and Start Services

```bash
# Build Docker images and start all services
make up
```

This will:
- Build the backend Rust application
- Build the frontend React application
- Start both services with proper networking
- Create persistent volumes for data

### 2. Create Admin User

```bash
# Create admin user with Makefile
make seed-admin USERNAME=admin PASSWORD=admin123

# Or use the script directly
./scripts/init-admin.sh admin admin123
```

### 3. Access the Application

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:3000
- **Admin Login**: http://localhost:5173/admin/login

Login with the credentials you just created!

## Makefile Commands

The Makefile provides convenient commands for managing the application:

### Essential Commands

```bash
make help           # Show all available commands
make build          # Build Docker images
make up             # Start all services
make down           # Stop all services
make logs           # View logs from all services
make restart        # Restart all services
```

### Development Commands

```bash
make logs-backend   # View backend logs only
make logs-frontend  # View frontend logs only
make ps             # List running containers
make status         # Show service status
make health         # Check health of services
```

### Admin Management

```bash
# Create admin user
make seed-admin USERNAME=myuser PASSWORD=mypass

# Open shell in backend container
make shell-backend

# Open shell in frontend container
make shell-frontend
```

### Data Management

```bash
make backup-db      # Backup database to backups/ directory
make restore-db FILE=backups/media_ranking_20231201_120000.db

# Note: Backups are stored locally in the backups/ folder
```

### Cleanup Commands

```bash
make stop           # Stop services (keeps containers)
make down           # Stop and remove containers
make clean          # Remove everything (containers, volumes, images)
make rebuild        # Clean rebuild from scratch
```

## Manual Docker Commands

If you prefer not to use the Makefile:

### Build Images

```bash
docker-compose build
```

### Start Services

```bash
docker-compose up -d
```

### Stop Services

```bash
docker-compose down
```

### View Logs

```bash
# All services
docker-compose logs -f

# Backend only
docker-compose logs -f backend

# Frontend only
docker-compose logs -f frontend
```

### Create Admin User

```bash
docker exec -it media-ranking-backend /app/seed_admin --username admin --password admin123
```

## Docker Compose Services

### Backend Service
- **Image**: Built from `backend/Dockerfile`
- **Port**: 3000 (host) → 3000 (container)
- **Volumes**:
  - `backend-data:/data` - SQLite database
  - `backend-uploads:/uploads` - Uploaded media files
- **Environment Variables**:
  - `DATABASE_URL` - SQLite database path
  - `JWT_SECRET` - Secret for JWT tokens
  - `UPLOAD_DIR` - Directory for uploads
  - `HOST` - Server host (0.0.0.0 for Docker)
  - `PORT` - Server port (3000)

### Frontend Service
- **Image**: Built from `frontend/Dockerfile` (nginx)
- **Port**: 5173 (host) → 80 (container)
- **Depends on**: Backend service
- **Serves**: Static React build with nginx

## Persistent Data

Data is stored in Docker volumes:

### List Volumes
```bash
docker volume ls | grep media-ranking
```

### Inspect Volume
```bash
docker volume inspect audio_ranking_backend-data
docker volume inspect audio_ranking_backend-uploads
```

### Backup Volumes

```bash
# Using Makefile
make backup-db

# Manual backup
docker cp media-ranking-backend:/data/media_ranking.db ./backups/
docker cp media-ranking-backend:/uploads ./backups/uploads/
```

### Restore Volumes

```bash
# Using Makefile
make restore-db FILE=backups/media_ranking_20231201_120000.db

# Manual restore
docker cp ./backups/media_ranking.db media-ranking-backend:/data/
```

## Environment Variables

### Backend (.env.docker)

You can override these in docker-compose.yml or create a `.env` file:

```env
DATABASE_URL=sqlite:/data/media_ranking.db
JWT_SECRET=your-secure-random-secret-here
UPLOAD_DIR=/uploads
HOST=0.0.0.0
PORT=3000
```

### Setting Custom JWT Secret

```bash
# Option 1: Edit docker-compose.yml
# Change the JWT_SECRET environment variable

# Option 2: Use .env file in root directory
echo "JWT_SECRET=my-super-secret-key" > .env
docker-compose up -d
```

## Networking

Services communicate via the `media-ranking-network` bridge network:

- Backend is accessible at `http://backend:3000` from within the network
- Frontend connects to backend via the host machine at `http://localhost:3000`

### Port Mapping

| Service  | Container Port | Host Port |
|----------|---------------|-----------|
| Backend  | 3000          | 3000      |
| Frontend | 80            | 5173      |

### Change Ports

Edit `docker-compose.yml`:

```yaml
services:
  backend:
    ports:
      - "8080:3000"  # Change host port to 8080

  frontend:
    ports:
      - "8000:80"    # Change host port to 8000
```

## Health Checks

Both services include health checks:

### Backend Health
```bash
curl http://localhost:3000/api/admin/login
```

### Frontend Health
```bash
curl http://localhost:5173/health
```

### Check Health Status
```bash
make health

# Or manually
docker inspect --format='{{.State.Health.Status}}' media-ranking-backend
docker inspect --format='{{.State.Health.Status}}' media-ranking-frontend
```

## Troubleshooting

### Services Won't Start

```bash
# Check logs
make logs

# Check if ports are in use
lsof -i :3000
lsof -i :5173

# Rebuild from scratch
make rebuild
```

### Database Issues

```bash
# Reset database (WARNING: deletes all data)
docker volume rm audio_ranking_backend-data
make up

# Recreate admin user
make seed-admin USERNAME=admin PASSWORD=admin123
```

### Upload Issues

```bash
# Check upload volume
docker volume inspect audio_ranking_backend-uploads

# Reset uploads (WARNING: deletes all uploads)
docker volume rm audio_ranking_backend-uploads
make up
```

### Container Won't Stop

```bash
# Force stop
docker-compose down --timeout 0

# Force remove
docker rm -f media-ranking-backend media-ranking-frontend
```

### Permission Denied on Scripts

```bash
# Make scripts executable
chmod +x scripts/*.sh
```

## Production Deployment

For production use:

### 1. Update Environment Variables

```bash
# Generate a secure JWT secret
openssl rand -base64 32

# Update docker-compose.yml or create .env file
JWT_SECRET=<your-generated-secret>
```

### 2. Use Production Ports

```yaml
# docker-compose.yml
services:
  frontend:
    ports:
      - "80:80"  # Standard HTTP port
```

### 3. Add HTTPS

Use a reverse proxy like nginx or Traefik:

```yaml
# Example with Traefik labels
labels:
  - "traefik.enable=true"
  - "traefik.http.routers.media-ranking.rule=Host(`yourdomain.com`)"
  - "traefik.http.routers.media-ranking.tls.certresolver=letsencrypt"
```

### 4. Regular Backups

```bash
# Setup cron job for daily backups
0 2 * * * cd /path/to/audio_ranking && make backup-db
```

### 5. Resource Limits

Add resource limits to docker-compose.yml:

```yaml
services:
  backend:
    deploy:
      resources:
        limits:
          cpus: '1.0'
          memory: 512M
```

## Development Workflow

### Working with Local Code

If you want to develop locally while using Docker for other services:

```bash
# Run backend locally
make dev-backend

# Run frontend locally
make dev-frontend

# Or use Docker for one, local for other
docker-compose up backend    # Backend in Docker
cd frontend && npm run dev   # Frontend locally
```

### Rebuilding After Code Changes

```bash
# Rebuild specific service
docker-compose build backend

# Rebuild and restart
docker-compose up -d --build backend

# Or use Makefile
make rebuild
```

## Debugging

### Access Container Shell

```bash
# Backend
make shell-backend
# Or: docker exec -it media-ranking-backend /bin/sh

# Frontend
make shell-frontend
# Or: docker exec -it media-ranking-frontend /bin/sh
```

### View Container Processes

```bash
docker top media-ranking-backend
docker top media-ranking-frontend
```

### Check Resource Usage

```bash
docker stats media-ranking-backend media-ranking-frontend
```

## Sharing Your Setup

To share with team members:

1. **Commit the Docker files**:
   ```bash
   git add docker-compose.yml Makefile backend/Dockerfile frontend/Dockerfile
   git commit -m "Add Docker setup"
   git push
   ```

2. **Team members clone and run**:
   ```bash
   git clone <your-repo>
   cd audio_ranking
   make up
   make seed-admin USERNAME=admin PASSWORD=admin123
   ```

3. **Share credentials securely** (not in git):
   - Use environment variables
   - Use secret management tools
   - Share .env files through secure channels

## Cleaning Up

### Remove Everything

```bash
# Interactive cleanup (asks for confirmation)
make clean

# Force cleanup
docker-compose down -v --rmi all
docker volume rm audio_ranking_backend-data audio_ranking_backend-uploads
```

### Keep Data, Remove Containers

```bash
make down
```

## Advanced Configuration

### Custom Database Location

```yaml
# docker-compose.yml
services:
  backend:
    volumes:
      - ./my-data:/data  # Use local directory instead of volume
```

### Multiple Environments

```bash
# Create docker-compose.prod.yml
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

## Performance Tips

1. **Use BuildKit** for faster builds:
   ```bash
   export DOCKER_BUILDKIT=1
   make build
   ```

2. **Multi-stage build** is already optimized in Dockerfiles

3. **Volume caching** for dependencies:
   ```yaml
   volumes:
     - cargo-cache:/usr/local/cargo/registry
   ```

## FAQ

**Q: How do I update the application?**
```bash
git pull
make rebuild
```

**Q: Can I run this on ARM (M1/M2 Mac)?**
Yes, Docker will build for your architecture automatically.

**Q: How do I change the database?**
Edit `DATABASE_URL` in docker-compose.yml. SQLite is recommended for simplicity.

**Q: Can I use PostgreSQL instead?**
Yes, but you'll need to modify the backend code and add a PostgreSQL service to docker-compose.yml.

**Q: How do I migrate data between servers?**
```bash
# On source server
make backup-db

# Copy backups/ folder to new server

# On destination server
make restore-db FILE=backups/media_ranking_XXXXXX.db
```

## Support

For issues:
1. Check logs: `make logs`
2. Check health: `make health`
3. Try rebuild: `make rebuild`
4. Refer to main [README.md](./README.md)
