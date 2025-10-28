# Docker Quick Reference

## One-Line Setup

```bash
make up && make seed-admin USERNAME=admin PASSWORD=admin123
```

Then open http://localhost:5173/admin/login

## Essential Commands

| Command | Description |
|---------|-------------|
| `make up` | Start everything |
| `make down` | Stop everything |
| `make logs` | View logs |
| `make restart` | Restart services |
| `make seed-admin USERNAME=x PASSWORD=y` | Create admin |
| `make backup-db` | Backup database |
| `make clean` | Remove everything |
| `make help` | Show all commands |

## URLs

- Frontend: http://localhost:5173
- Backend API: http://localhost:3000
- Health Check: http://localhost:5173/health

## Troubleshooting

### Services won't start
```bash
make logs
make rebuild
```

### Can't login
```bash
make seed-admin USERNAME=admin PASSWORD=admin123
```

### Reset everything
```bash
make clean
make up
make seed-admin USERNAME=admin PASSWORD=admin123
```

## Advanced

### View specific logs
```bash
make logs-backend
make logs-frontend
```

### Access container shell
```bash
make shell-backend
make shell-frontend
```

### Check health
```bash
make health
make status
```

### Restore database
```bash
make restore-db FILE=backups/media_ranking_20231201_120000.db
```

## Development Mode

Run locally without Docker:

```bash
# Backend (terminal 1)
make dev-backend

# Frontend (terminal 2)
make dev-frontend
```

## Production Deployment

1. Set secure JWT secret in docker-compose.yml
2. Change ports if needed
3. Set up reverse proxy for HTTPS
4. Set up automated backups with cron

See [DOCKER.md](./DOCKER.md) for full documentation.
