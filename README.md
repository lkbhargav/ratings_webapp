# Media Ranking System

A full-stack application for ranking media files (audio, video, images, and text) by your team. Built with React (TypeScript) for the frontend and Rust (Axum) for the backend.

## Features

### Admin Panel
- **JWT-based authentication** for admin access
- **Category management** - Create and organize media by categories
- **Media upload** - Upload audio, video, image, and text files
- **Test creation** - Create tests with selected categories
- **User management** - Generate one-time links for users via email
- **Results dashboard** - View aggregated statistics and individual user responses
- **Test lifecycle** - Manually close tests to stop accepting ratings
- **Activity logging** - Comprehensive audit trail with filtering by admin, user, action type, entity, and date range
- **Admin user management** - Create and manage admin accounts (super admin only)

### User Interface
- **One-time token access** - Secure, shareable links for each user
- **Multi-media support** - Audio/video players, image viewers, and text display
- **Star ratings (0-5)** with optional text comments
- **Re-rating allowed** - Users can update their ratings before test closes
- **Progress tracking** - Visual progress indicator showing completion status

## Project Structure

```
audio_ranking/
├── backend/              # Rust + Axum backend
│   ├── src/
│   │   ├── db/          # SQLite schema & migrations
│   │   ├── models/      # Data models
│   │   ├── handlers/    # API route handlers
│   │   ├── middleware/  # JWT authentication
│   │   ├── utils/       # Auth helpers
│   │   └── bin/         # CLI tools (seed_admin)
│   ├── .env             # Environment variables
│   └── Cargo.toml
├── frontend/            # React + TypeScript frontend
│   ├── src/
│   │   ├── components/  # React components
│   │   ├── pages/       # Page components
│   │   ├── utils/       # API & auth utilities
│   │   └── types/       # TypeScript types
│   └── package.json
└── uploads/             # Local media file storage

```

## Quick Start with Docker (Recommended)

The easiest way to run the application is using Docker:

```bash
# 1. Build and start services
make up

# 2. Create admin user
make seed-admin USERNAME=admin PASSWORD=admin123

# 3. Access the app
# Frontend: http://localhost:5173
# Backend API: http://localhost:3000
```

That's it! See [DOCKER.md](./DOCKER.md) for detailed Docker documentation.

### Other Makefile Commands

```bash
make help           # Show all commands
make logs           # View logs
make down           # Stop services
make clean          # Remove everything
make backup-db      # Backup database
```

## Manual Setup Instructions

If you prefer to run without Docker:

### Backend Setup

1. **Navigate to backend directory:**
   ```bash
   cd backend
   ```

2. **Install Rust dependencies:**
   ```bash
   cargo build
   ```

3. **Configure environment variables:**
   - The `.env` file is already created with default values
   - Change `JWT_SECRET` in production

4. **Run database migrations (automatic on first start):**
   ```bash
   cargo run --bin server
   ```

5. **Create initial admin user:**
   ```bash
   cargo run --bin seed_admin -- --username admin --password yourpassword
   ```

6. **Start the backend server:**
   ```bash
   cargo run --bin server
   ```

   The backend will run on `http://localhost:3000`

### Frontend Setup

1. **Navigate to frontend directory:**
   ```bash
   cd frontend
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Start the development server:**
   ```bash
   npm run dev
   ```

   The frontend will run on `http://localhost:5173`

## Usage Guide

### Admin Workflow

1. **Login:**
   - Navigate to `http://localhost:5173/admin/login`
   - Use the admin credentials you created with seed_admin

2. **Create Categories:**
   - Go to "Categories" tab
   - Add categories for organizing your media (e.g., "Product Demos", "Music Samples")

3. **Upload Media:**
   - Go to "Media Files" tab
   - Select a category and upload your media files
   - Supports: audio (mp3, wav, ogg), video (mp4, webm), images (jpg, png), text (txt)

4. **Create Test:**
   - Go to "Tests" tab
   - Enter test name and select categories to include
   - Click "Create Test"

5. **Add Users:**
   - Select the test from the dropdown
   - Enter user email addresses
   - Copy the generated one-time link and share with users

6. **View Results:**
   - Go to "Results" tab
   - Select a test to view statistics
   - Toggle between "Aggregated" (average ratings) and "Individual" (all responses)

7. **Close Test:**
   - In "Tests" tab, click "Close Test" to stop accepting new ratings

### User Workflow

1. **Access Test:**
   - Open the one-time link provided by admin
   - The link format: `http://localhost:5173/test/{token}`

2. **Rate Media:**
   - View each media file (with appropriate player/viewer)
   - Select star rating (1-5 stars)
   - Optionally add comments
   - Click "Save Rating"

3. **Navigate:**
   - Use Previous/Next buttons to move between media files
   - Progress bar shows how many items you've rated
   - You can return and update ratings anytime before test closes

## API Endpoints

### Public Endpoints
- `POST /api/admin/login` - Admin authentication
- `GET /api/test/:token` - Get test details (user)
- `GET /api/test/:token/media` - List media for rating
- `POST /api/test/:token/ratings` - Submit/update rating
- `GET /api/media/:id/serve` - Serve media file

### Admin Endpoints (JWT Protected)
- `POST /api/admin/users` - Create additional admin
- `GET/POST /api/admin/categories` - Manage categories
- `DELETE /api/admin/categories/:id` - Delete category
- `POST /api/admin/media/upload` - Upload media
- `GET /api/admin/media` - List media (with filters)
- `DELETE /api/admin/media/:id` - Delete media
- `PUT /api/admin/media/:id/categories` - Update media categories
- `GET/POST /api/admin/tests` - Manage tests
- `POST /api/admin/tests/:id/users` - Add user to test
- `DELETE /api/admin/tests/:test_id/users/:user_id` - Remove user from test
- `PATCH /api/admin/tests/:id/close` - Close test
- `GET /api/admin/tests/:id/results` - Get test results
- `GET /api/admin/activity-logs` - Get activity logs with filters
- `POST /api/admin/change-password` - Change admin password

## Database Schema

- **admins** - Admin user accounts with hashed passwords
- **categories** - Media categories
- **media_files** - Uploaded media with type information
- **media_file_categories** - Many-to-many relationship between media and categories
- **tests** - Rating tests with open/closed status
- **test_categories** - Many-to-many relationship between tests and categories
- **test_users** - User tokens for accessing tests
- **ratings** - User ratings with stars and comments
- **activity_logs** - Comprehensive audit trail of all admin and user actions

## Technology Stack

### Backend
- **Rust** - Systems programming language
- **Axum** - Web framework
- **SQLite** - Embedded database via sqlx
- **JWT** - Token-based authentication
- **bcrypt** - Password hashing
- **Tower-HTTP** - CORS and file serving

### Frontend
- **React 18** - UI library
- **TypeScript** - Type-safe JavaScript
- **Vite** - Build tool
- **React Router** - Client-side routing
- **Axios** - HTTP client

## Security Features

- JWT-based admin authentication with 24-hour token expiry
- Bcrypt password hashing
- One-time tokens for user access
- CORS enabled for frontend-backend communication
- Protected admin routes with middleware
- Input validation on all forms

## Development Tips

- Backend logs are displayed in the terminal running `cargo run`
- Frontend hot-reloading is automatic when you save files
- Database file is created at `media_ranking.db` in the root directory
- Uploaded files are stored in `uploads/` directory

## Production Deployment

### Prerequisites
- Server with Docker and Docker Compose installed
- Domain names configured (DNS A records pointing to server)
- SSL certificates for your domains
- Nginx installed on host machine (for reverse proxy)

### Deployment Steps

1. **Update Environment Variables**

   Generate a secure JWT secret:
   ```bash
   openssl rand -base64 32
   ```

   Update `backend/.env.docker`:
   ```env
   JWT_SECRET=your-generated-secure-secret-here
   FRONTEND_URL=https://your-frontend-domain.com
   ```

2. **Update SSL Certificate Paths**

   Edit `nginx-production.conf` and replace:
   ```nginx
   ssl_certificate /path/to/ssl/your-domain/fullchain.pem;
   ssl_certificate_key /path/to/ssl/your-domain/privkey.pem;
   ```

3. **Install Nginx Reverse Proxy Configuration**

   ```bash
   sudo cp nginx-production.conf /etc/nginx/sites-available/surveys
   sudo ln -s /etc/nginx/sites-available/surveys /etc/nginx/sites-enabled/
   sudo nginx -t  # Test configuration
   sudo systemctl reload nginx
   ```

4. **Build and Start Services**

   ```bash
   # Rebuild with production environment
   docker-compose build --no-cache

   # Start services
   docker-compose up -d

   # Create admin user
   docker-compose exec backend /app/seed_admin admin yourpassword
   ```

5. **Verify Deployment**

   - Frontend: https://your-frontend-domain.com
   - Backend health: https://your-backend-domain.com/api/admin/login
   - Check logs: `docker-compose logs -f`

### Configuration Files Modified for Production

The following files have been configured for production deployment:

- ✅ `backend/.env.docker` - Updated with production URLs
- ✅ `frontend/.env.production` - Updated with production API URL
- ✅ `backend/src/main.rs` - CORS restricted to production domain
- ✅ `frontend/nginx.conf` - Updated server_name
- ✅ `docker-compose.yml` - Ports bound to localhost only
- ✅ `nginx-production.conf` - Nginx reverse proxy configuration

### Security Checklist

- ✅ JWT secret changed to secure random string
- ✅ CORS configured for specific domain only
- ✅ HTTPS enabled with SSL certificates
- ✅ Ports bound to localhost (not publicly exposed)
- ✅ Nginx reverse proxy with security headers
- ⚠️ Set up firewall (allow only 80, 443, and SSH)
- ⚠️ Configure regular database backups
- ⚠️ Set up monitoring and log aggregation
- ⚠️ Consider rate limiting at nginx level

### Maintenance

**View Logs:**
```bash
docker-compose logs -f backend    # Backend logs
docker-compose logs -f frontend   # Frontend logs
```

**Backup Database:**
```bash
docker cp media-ranking-backend:/data/media_ranking.db ./backup-$(date +%Y%m%d).db
```

**Update Application:**
```bash
git pull
docker-compose build --no-cache
docker-compose up -d
```

## Troubleshooting

### Backend won't start
- Ensure Rust is installed: `rustc --version`
- Check if port 3000 is available
- Verify `.env` file exists in backend directory

### Frontend won't start
- Ensure Node.js is installed: `node --version`
- Delete `node_modules` and run `npm install` again
- Check if port 5173 is available

### Can't upload files
- Verify `uploads/` directory exists in root
- Check file size limits (adjust in backend if needed)
- Ensure correct MIME types are accepted

### Token/Auth issues
- Check JWT_SECRET is set in backend/.env
- Verify admin was created successfully with seed_admin
- Clear browser localStorage if having login issues

## License

MIT License - See [LICENSE](./LICENSE) file for details.
