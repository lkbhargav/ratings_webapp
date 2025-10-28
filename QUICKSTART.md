# Quick Start Guide

This guide will help you get the Media Ranking System up and running in just a few minutes.

## Prerequisites

- **Rust** (latest stable): Install from https://rustup.rs/
- **Node.js** (v20.19+ or v22.12+): Install from https://nodejs.org/
- **npm** (comes with Node.js)

## Step 1: Setup Backend (Terminal 1)

```bash
cd backend

# Build the project (this will take a few minutes the first time)
cargo build --release

# Create the first admin user
cargo run --bin seed_admin -- --username admin --password admin123

# Start the backend server
cargo run --bin server
```

The backend will start on **http://localhost:3000**

## Step 2: Setup Frontend (Terminal 2)

```bash
cd frontend

# Install dependencies
npm install

# Start the development server
npm run dev
```

The frontend will start on **http://localhost:5173**

## Step 3: Access the Application

1. **Admin Panel**: Open http://localhost:5173/admin/login
   - Username: `admin`
   - Password: `admin123` (or whatever you set above)

2. **Follow the workflow**:
   - Create categories
   - Upload media files
   - Create a test
   - Add users and generate links
   - Share links with your team
   - View results

## Common Issues

### Backend fails to start
```bash
# Make sure port 3000 is free
lsof -i :3000

# If something is using it, kill it or change the PORT in backend/.env
```

### Frontend fails to start
```bash
# Make sure port 5173 is free
lsof -i :5173

# Or it will automatically use the next available port
```

### Can't login
```bash
# Recreate the admin user
cd backend
cargo run --bin seed_admin -- --username admin --password admin123
```

### Database issues
```bash
# Delete and recreate the database
rm media_ranking.db
cargo run --bin server  # This will recreate it
cargo run --bin seed_admin -- --username admin --password admin123
```

## Production Deployment

For production use, you should:

1. Change the `JWT_SECRET` in `backend/.env`
2. Build frontend for production: `npm run build` in frontend directory
3. Serve the `frontend/dist` folder with nginx or similar
4. Use environment variables for configuration
5. Set up HTTPS
6. Consider using PostgreSQL instead of SQLite for better concurrency

## Next Steps

Check out the main [README.md](./README.md) for:
- Detailed feature documentation
- API endpoints reference
- Database schema
- Security considerations
- Full usage guide
