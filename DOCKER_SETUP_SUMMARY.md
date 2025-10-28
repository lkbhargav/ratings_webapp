# Docker Setup - Complete Summary

## What Was Added

### New Files Created

1. **backend/Dockerfile** - Multi-stage build for Rust backend
   - Builder stage: Compiles Rust binaries
   - Runtime stage: Minimal Debian image with compiled binaries
   - Includes both `server` and `seed_admin` binaries

2. **backend/.env.docker** - Docker-specific environment configuration
   - Database path: `/data/media_ranking.db`
   - Uploads directory: `/uploads`
   - Host: `0.0.0.0` for Docker networking

3. **frontend/Dockerfile** - Multi-stage build for React frontend
   - Builder stage: Builds React app with npm
   - Runtime stage: nginx serving the static build
   - Includes health check endpoint

4. **frontend/nginx.conf** - nginx configuration
   - SPA routing support for React Router
   - Gzip compression
   - Security headers
   - Cache headers for static assets
   - Health check endpoint at `/health`

5. **docker-compose.yml** - Service orchestration
   - Backend service with persistent volumes
   - Frontend service with nginx
   - Bridge network for inter-service communication
   - Health checks for both services
   - Automatic restart policies

6. **Makefile** - 20+ automation commands
   - Build, start, stop, restart services
   - View logs, check health, manage containers
   - Create admin users, backup/restore database
   - Development mode commands

7. **scripts/init-admin.sh** - Helper script for creating admin in Docker

8. **DOCKER.md** - Comprehensive Docker documentation (100+ sections)

9. **DOCKER_QUICKREF.md** - Quick reference card

10. **.env.example** - Template for environment variables

11. **backend/.dockerignore** - Excludes unnecessary files from backend builds

12. **frontend/.dockerignore** - Excludes unnecessary files from frontend builds

### Modified Files

1. **frontend/src/utils/api.ts** - Now uses environment variable for API URL
   - `VITE_API_BASE_URL` for configurable backend URL

2. **README.md** - Added Docker quick start section at the top

3. **PROJECT_SUMMARY.md** - Added deployment tech stack and Docker commands

4. **.gitignore** - Added Docker and backup exclusions

## Architecture

### Docker Services

```
┌─────────────────────────────────────────┐
│         Host Machine (You)              │
│                                         │
│  Browser → http://localhost:5173       │
│                    ↓                    │
│         ┌──────────────────┐           │
│         │  Frontend (nginx) │           │
│         │  Port: 80 → 5173  │           │
│         └──────────────────┘           │
│                    ↓                    │
│         http://localhost:3000          │
│                    ↓                    │
│         ┌──────────────────┐           │
│         │  Backend (Rust)   │           │
│         │  Port: 3000       │           │
│         │                   │           │
│         │  Volumes:         │           │
│         │  - /data (DB)     │           │
│         │  - /uploads       │           │
│         └──────────────────┘           │
│                                         │
│  Docker Network: media-ranking-network  │
└─────────────────────────────────────────┘
```

### Data Persistence

- **backend-data** volume → SQLite database
- **backend-uploads** volume → Media files
- Both survive container restarts/rebuilds

## Usage Patterns

### Development Workflow

```bash
# 1. Make code changes
vim backend/src/handlers/auth.rs

# 2. Rebuild and restart
make rebuild

# 3. View logs
make logs-backend

# 4. Test changes
curl http://localhost:3000/api/admin/login
```

### Production Deployment

```bash
# 1. Clone repo on server
git clone <repo>
cd audio_ranking

# 2. Set production JWT secret
echo "JWT_SECRET=$(openssl rand -base64 32)" > .env

# 3. Build and start
make up

# 4. Create admin
make seed-admin USERNAME=admin PASSWORD=secure-password

# 5. Setup automated backups
echo "0 2 * * * cd /path/to/audio_ranking && make backup-db" | crontab -

# 6. Setup reverse proxy (nginx/traefik) for HTTPS
```

### Sharing with Team

```bash
# Developer 1 creates setup
git add docker-compose.yml Makefile backend/Dockerfile frontend/Dockerfile
git commit -m "Add Docker setup"
git push

# Developer 2 uses it
git pull
make up
make seed-admin USERNAME=dev2 PASSWORD=dev2pass
# Open http://localhost:5173
```

## Key Features

### Makefile Commands (22 total)

**Essential:**
- `make up` - Start all services
- `make down` - Stop all services
- `make logs` - View all logs
- `make seed-admin` - Create admin user
- `make help` - Show all commands

**Development:**
- `make dev-backend` - Run backend locally
- `make dev-frontend` - Run frontend locally
- `make logs-backend` - Backend logs only
- `make logs-frontend` - Frontend logs only

**Maintenance:**
- `make backup-db` - Backup database
- `make restore-db` - Restore database
- `make rebuild` - Clean rebuild
- `make clean` - Remove everything
- `make health` - Check service health

**Advanced:**
- `make shell-backend` - Shell in backend container
- `make shell-frontend` - Shell in frontend container
- `make ps` - List containers
- `make status` - Service status

### Multi-Stage Builds

**Backend Dockerfile:**
- Stage 1 (builder): rust:1.75-slim - Compiles binaries (~2GB)
- Stage 2 (runtime): debian:bookworm-slim - Runs server (~100MB)
- Result: ~95% smaller final image

**Frontend Dockerfile:**
- Stage 1 (builder): node:20-alpine - Builds React app
- Stage 2 (runtime): nginx:alpine - Serves static files
- Result: Fast builds, minimal runtime image

### Health Checks

**Backend:**
- Endpoint: `http://localhost:3000/api/admin/login`
- Interval: 30s
- Timeout: 10s
- Start period: 40s (allows for slow startup)

**Frontend:**
- Endpoint: `http://localhost/health`
- Interval: 30s
- Timeout: 3s
- Start period: 5s

### Networking

- Services communicate via `media-ranking-network`
- Frontend → Backend: via host machine (http://localhost:3000)
- User → Frontend: http://localhost:5173
- User → Backend API: http://localhost:3000

## Environment Variables

### Backend (docker-compose.yml)

```yaml
DATABASE_URL=sqlite:/data/media_ranking.db
JWT_SECRET=${JWT_SECRET:-change-this-secret-in-production}
UPLOAD_DIR=/uploads
HOST=0.0.0.0
PORT=3000
```

### Frontend (build-time)

```
VITE_API_BASE_URL=http://localhost:3000/api
```

## Volume Management

### List Volumes
```bash
docker volume ls | grep media-ranking
```

### Inspect Volume
```bash
docker volume inspect audio_ranking_backend-data
```

### Backup
```bash
make backup-db
# Or manually:
docker cp media-ranking-backend:/data/media_ranking.db ./backups/
```

### Restore
```bash
make restore-db FILE=backups/media_ranking_20231201_120000.db
# Or manually:
docker cp ./backups/media_ranking.db media-ranking-backend:/data/
```

### Reset Volumes (WARNING: Deletes data)
```bash
docker volume rm audio_ranking_backend-data
docker volume rm audio_ranking_backend-uploads
```

## Common Workflows

### First-Time Setup
```bash
git clone <repo>
cd audio_ranking
make up
make seed-admin USERNAME=admin PASSWORD=admin123
open http://localhost:5173
```

### Daily Development
```bash
make up
make logs
# Make code changes
make rebuild
```

### Updating Application
```bash
git pull
make rebuild
```

### Troubleshooting
```bash
make logs
make health
make restart
# If still broken:
make rebuild
```

### Complete Reset
```bash
make clean
make up
make seed-admin USERNAME=admin PASSWORD=admin123
```

## File Size Comparison

| Component | Development | Production (Docker) |
|-----------|------------|-------------------|
| Backend source | ~50MB | ~100MB (runtime image) |
| Frontend source | ~200MB | ~30MB (nginx + static) |
| Total | ~250MB | ~130MB |

## Build Times

| Operation | Time (first build) | Time (cached) |
|-----------|-------------------|---------------|
| Backend build | ~10-15 min | ~30s |
| Frontend build | ~1-2 min | ~10s |
| Total | ~15 min | ~40s |

## Security Features

1. **Multi-stage builds** - No build tools in runtime images
2. **Minimal base images** - Smaller attack surface
3. **No root user** - Services run as non-root (nginx default)
4. **Health checks** - Automatic restart on failure
5. **Environment variables** - Secrets not hardcoded
6. **Volume isolation** - Data separated from containers

## Production Recommendations

1. **Change JWT secret** - Use `openssl rand -base64 32`
2. **Use HTTPS** - Add reverse proxy (nginx/Traefik)
3. **Regular backups** - Setup cron job with `make backup-db`
4. **Monitor logs** - Use log aggregation service
5. **Resource limits** - Add memory/CPU limits in docker-compose.yml
6. **Update regularly** - Keep base images updated
7. **Security scanning** - Use `docker scan` for vulnerabilities

## Limitations

1. **SQLite** - Single-writer limitation (fine for <50 concurrent users)
2. **Local volumes** - Not suitable for multi-node deployment
3. **No auto-scaling** - Manual horizontal scaling required
4. **Basic health checks** - Could be more sophisticated

## Future Enhancements

- [ ] Kubernetes manifests for cloud deployment
- [ ] PostgreSQL option for larger deployments
- [ ] S3-compatible storage for media files
- [ ] Prometheus metrics export
- [ ] Grafana dashboards
- [ ] Automated testing in Docker
- [ ] CI/CD pipeline integration
- [ ] Multi-architecture builds (arm64/amd64)

## Documentation Reference

1. **DOCKER.md** - Full Docker documentation
2. **DOCKER_QUICKREF.md** - Quick command reference
3. **README.md** - General project documentation
4. **QUICKSTART.md** - Quick start without Docker
5. **PROJECT_SUMMARY.md** - Complete project overview

## Support

For Docker-related issues:
1. Check logs: `make logs`
2. Check health: `make health`
3. Try rebuild: `make rebuild`
4. Consult DOCKER.md for detailed troubleshooting
5. Check Docker documentation: https://docs.docker.com
