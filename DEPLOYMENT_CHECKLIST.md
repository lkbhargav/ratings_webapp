# Production Deployment Checklist

This document provides a step-by-step checklist for deploying the Media Ranking application to production.

## Deployment Configuration

**Frontend Domain:** https://surveys.nocturnal.health
**Backend Domain:** https://surveysbackend.nocturnal.health

---

## Pre-Deployment Checklist

### Server Setup
- [ ] Server provisioned with Ubuntu/Debian Linux
- [ ] Docker installed (version 20.10+)
- [ ] Docker Compose installed (version 2.0+)
- [ ] Nginx installed on host machine
- [ ] Firewall configured (allow ports 80, 443, 22)

### DNS Configuration
- [ ] A record for `surveys.nocturnal.health` → Server IP
- [ ] A record for `surveysbackend.nocturnal.health` → Server IP
- [ ] DNS propagation complete (check with `nslookup` or `dig`)

### SSL Certificates
- [ ] SSL certificate obtained for `surveys.nocturnal.health`
- [ ] SSL certificate obtained for `surveysbackend.nocturnal.health`
- [ ] Certificate files accessible on server
- [ ] Certificate paths noted for nginx configuration

---

## Configuration Updates (Already Done)

The following files have been updated with production domains:

✅ **backend/.env.docker**
   - `FRONTEND_URL=https://surveys.nocturnal.health`
   - ⚠️ **ACTION REQUIRED:** Update `JWT_SECRET` with secure random string

✅ **frontend/.env.production**
   - `VITE_API_BASE_URL=https://surveysbackend.nocturnal.health/api`

✅ **backend/src/main.rs**
   - CORS restricted to `https://surveys.nocturnal.health`

✅ **frontend/nginx.conf**
   - `server_name surveys.nocturnal.health`

✅ **docker-compose.yml**
   - Backend port: `127.0.0.1:3000:3000`
   - Frontend port: `127.0.0.1:8080:80`

✅ **nginx-production.conf** (created)
   - Reverse proxy configuration for both domains

---

## Deployment Steps

### Step 1: Generate Secure JWT Secret

```bash
# Generate a secure random secret
openssl rand -base64 32

# Copy the output and update backend/.env.docker
# Replace JWT_SECRET value with the generated string
```

- [ ] JWT secret generated
- [ ] `backend/.env.docker` updated with secure JWT secret

### Step 2: Update SSL Certificate Paths

Edit `nginx-production.conf` and update the SSL certificate paths (4 locations):

```nginx
# Line 19-20 (backend)
ssl_certificate /path/to/ssl/surveysbackend.nocturnal.health/fullchain.pem;
ssl_certificate_key /path/to/ssl/surveysbackend.nocturnal.health/privkey.pem;

# Line 98-99 (frontend)
ssl_certificate /path/to/ssl/surveys.nocturnal.health/fullchain.pem;
ssl_certificate_key /path/to/ssl/surveys.nocturnal.health/privkey.pem;
```

- [ ] Backend SSL certificate path updated
- [ ] Backend SSL key path updated
- [ ] Frontend SSL certificate path updated
- [ ] Frontend SSL key path updated

### Step 3: Install Nginx Configuration

```bash
# Copy nginx config to sites-available
sudo cp nginx-production.conf /etc/nginx/sites-available/nocturnal-surveys

# Create symlink to sites-enabled
sudo ln -s /etc/nginx/sites-available/nocturnal-surveys /etc/nginx/sites-enabled/

# Test nginx configuration
sudo nginx -t

# If test passes, reload nginx
sudo systemctl reload nginx
```

- [ ] Nginx config copied
- [ ] Symlink created
- [ ] Nginx configuration tested successfully
- [ ] Nginx reloaded

### Step 4: Build Application

```bash
# Navigate to project directory
cd /path/to/audio_ranking

# Build Docker images with production config
docker-compose build --no-cache
```

- [ ] Backend built successfully
- [ ] Frontend built successfully (with production env vars)

### Step 5: Start Services

```bash
# Start all services in detached mode
docker-compose up -d

# Check container status
docker-compose ps

# View logs to ensure startup is clean
docker-compose logs -f
```

- [ ] Backend container running
- [ ] Frontend container running
- [ ] Database initialized
- [ ] No errors in logs

### Step 6: Create Admin User

```bash
# Create the first admin user
docker-compose exec backend /app/seed_admin admin YourSecurePassword123

# Or with custom username
docker-compose exec backend /app/seed_admin your_username YourSecurePassword123
```

- [ ] Admin user created successfully
- [ ] Admin credentials saved securely

### Step 7: Verify Deployment

**Frontend Tests:**
- [ ] Visit https://surveys.nocturnal.health
- [ ] No SSL warnings
- [ ] Page loads correctly
- [ ] No console errors (F12 Developer Tools)

**Backend Tests:**
- [ ] Visit https://surveysbackend.nocturnal.health/api/admin/login
- [ ] Returns JSON (not 404 or connection error)
- [ ] No SSL warnings

**Integration Tests:**
- [ ] Login to admin panel at https://surveys.nocturnal.health/admin/login
- [ ] Login succeeds with created admin credentials
- [ ] Dashboard loads correctly
- [ ] Can create a category
- [ ] Can upload a media file
- [ ] Can create a test

**User Flow Test:**
- [ ] Create a test and add test user
- [ ] Copy test user link
- [ ] Open link in incognito/private window
- [ ] Verify user can access and rate media

---

## Post-Deployment Tasks

### Security Hardening

```bash
# Configure firewall (UFW example)
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS
sudo ufw enable

# Set up fail2ban for SSH protection
sudo apt-get install fail2ban
sudo systemctl enable fail2ban
```

- [ ] Firewall configured
- [ ] Only necessary ports open
- [ ] Fail2ban configured for SSH

### Monitoring Setup

- [ ] Set up log rotation for nginx logs
- [ ] Configure Docker log rotation
- [ ] Set up monitoring/alerting (optional: UptimeRobot, Pingdom)
- [ ] Configure backup schedule

### Backup Configuration

```bash
# Create backup directory
mkdir -p ~/backups

# Create backup script
cat > ~/backup-surveys.sh << 'EOF'
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
docker cp media-ranking-backend:/data/media_ranking.db ~/backups/db_$DATE.db
docker cp media-ranking-backend:/uploads ~/backups/uploads_$DATE -r
# Keep only last 7 days of backups
find ~/backups -type f -mtime +7 -delete
EOF

chmod +x ~/backup-surveys.sh

# Add to crontab (daily at 2 AM)
(crontab -l 2>/dev/null; echo "0 2 * * * ~/backup-surveys.sh") | crontab -
```

- [ ] Backup script created
- [ ] Backup cron job configured
- [ ] Test backup script runs successfully

---

## Troubleshooting

### Issue: Containers won't start
```bash
# Check logs
docker-compose logs backend
docker-compose logs frontend

# Check if ports are in use
sudo netstat -tlnp | grep -E ':(3000|8080)'

# Restart services
docker-compose restart
```

### Issue: 502 Bad Gateway
- Verify backend container is running: `docker-compose ps`
- Check backend logs: `docker-compose logs backend`
- Verify nginx can reach localhost:3000: `curl http://localhost:3000/api/admin/login`

### Issue: CORS errors in browser
- Verify backend CORS configuration in `backend/src/main.rs`
- Check that frontend URL exactly matches (including https://)
- Rebuild backend if CORS config changed: `docker-compose build backend && docker-compose up -d backend`

### Issue: SSL certificate errors
- Verify certificate paths in nginx-production.conf
- Check certificate validity: `openssl x509 -in /path/to/cert -text -noout`
- Ensure nginx has permission to read certificate files

---

## Rollback Procedure

If deployment fails and you need to rollback:

```bash
# Stop services
docker-compose down

# Restore previous configuration
git checkout <previous-commit>

# Rebuild and restart
docker-compose build --no-cache
docker-compose up -d
```

---

## Success Criteria

Deployment is complete when:

- ✅ Both domains are accessible via HTTPS with valid certificates
- ✅ Admin can log in and perform all actions
- ✅ Test users can access tests via generated links
- ✅ File uploads work correctly
- ✅ All API endpoints return correct responses
- ✅ No errors in browser console or server logs
- ✅ Backups are configured and tested

---

## Support Contacts

For issues during deployment:
- Check documentation: README.md, DOCKER.md
- Review logs: `docker-compose logs -f`
- Check nginx logs: `sudo tail -f /var/log/nginx/*.log`

---

## Maintenance Schedule

**Daily:**
- Monitor error logs
- Check disk space

**Weekly:**
- Review backup integrity
- Check for application updates

**Monthly:**
- Review SSL certificate expiration
- Review and rotate logs
- Security updates for server OS

---

*Last Updated: January 2025*
*Deployment Target: surveys.nocturnal.health / surveysbackend.nocturnal.health*
