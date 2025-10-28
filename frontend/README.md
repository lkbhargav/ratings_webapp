# Media Ranking Frontend

React-based frontend application for the Media Ranking system, providing both an admin dashboard and user test interface.

## Tech Stack

- **React 18** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool and dev server
- **React Router** - Client-side routing
- **Axios** - HTTP client for API calls

## Project Structure

```
src/
├── components/
│   ├── admin/           # Admin dashboard components
│   │   ├── ActivityLog.tsx       # Activity logging viewer
│   │   ├── AdminManagement.tsx   # Admin user management
│   │   ├── Categories.tsx        # Category management
│   │   ├── MediaUpload.tsx       # Media file upload
│   │   ├── TestResults.tsx       # Test results display
│   │   └── Tests.tsx             # Test creation & management
│   ├── user/            # User test interface components
│   │   ├── RatingInput.tsx       # Star rating input
│   │   └── TestView.tsx          # Test taking interface
│   └── StarRating.tsx   # Reusable star rating display
├── pages/
│   ├── AdminDashboard.tsx        # Main admin dashboard
│   ├── AdminLogin.tsx            # Admin login page
│   ├── ChangePassword.tsx        # Password change page
│   └── UserTest.tsx              # User test page
├── types/
│   └── index.ts         # TypeScript interfaces
└── utils/
    ├── api.ts           # Axios instance with auth
    └── auth.ts          # Auth token management
```

## Key Features

### Admin Dashboard
The admin dashboard provides a tabbed interface with the following sections:

1. **Categories** - Create and manage media categories (audio, video, image, text)
2. **Media Files** - Upload and organize media files with category assignment
3. **Tests** - Create tests, add users, generate one-time access links
4. **Results** - View aggregated ratings and individual user submissions
5. **Admin Management** - Create/delete admin users (super admin only)
6. **Activity Log** - View comprehensive activity logs with filtering capabilities

### User Test Interface
- Token-based access (one-time use links)
- Media playback/viewing
- Star rating system (0-5 stars, 0.5 increments)
- Optional text comments
- Progress tracking

## Development

### Prerequisites
- Node.js 18+ (Vite requires 20.19+ or 22.12+)
- npm or yarn

### Setup

```bash
# Install dependencies
npm install

# Start development server (http://localhost:5173)
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

### Environment Variables

The frontend expects the backend API to be available at:
- Development: `http://localhost:3000`
- Production: Configure via Docker or reverse proxy

## API Integration

### Authentication
- JWT tokens stored in localStorage
- `Authorization: Bearer <token>` header on protected requests
- Token managed via `utils/auth.ts`

### API Client
All API calls use the configured axios instance from `utils/api.ts`:
- Base URL: `/api` (proxied by Vite dev server or nginx in production)
- Automatic auth token injection
- Error handling and response interceptors

### Key API Endpoints
- `POST /api/admin/login` - Admin authentication
- `GET /api/test/:token` - Get test details by user token
- `POST /api/test/:token/ratings` - Submit ratings
- `GET /api/admin/tests/:id/results` - Get test results
- `GET /api/admin/activity-logs` - Get activity logs

## Component Architecture

### Styling Approach
Components use inline styles defined at the bottom of each file:
```typescript
const styles = {
  container: {
    padding: '2rem',
    // ...
  }
};
```

This approach keeps styles colocated with components without requiring a CSS-in-JS library.

### State Management
- React useState for component state
- useEffect for side effects and data fetching
- No global state management library (Redux, Zustand, etc.)
- Authentication state stored in localStorage

### Type Safety
All API responses and component props are typed using interfaces from `types/index.ts`.

## Building for Production

### Docker Build
```bash
# Build frontend Docker image
docker-compose build frontend

# Or manually
docker build -f frontend/Dockerfile -t media-ranking-frontend .
```

### Static Build
```bash
npm run build
# Output: dist/ directory
```

The production build includes:
- Minified JavaScript bundles
- Optimized assets
- index.html entry point
- Served via nginx in Docker deployment

## Development Guidelines

### Adding New Components
1. Create component in appropriate directory (`components/admin/` or `components/user/`)
2. Add types to `types/index.ts` if needed
3. Import and use in parent component or page
4. Follow inline styles pattern

### API Integration
1. Define TypeScript interfaces for request/response
2. Use the `api` instance from `utils/api.ts`
3. Handle loading and error states
4. Protected routes require valid JWT token

### Routing
Add new routes in `src/main.tsx`:
```typescript
<Route path="/your-route" element={<YourComponent />} />
```

## Browser Support

Modern browsers with ES2020+ support:
- Chrome/Edge 90+
- Firefox 88+
- Safari 14+

## Troubleshooting

### Development Server Issues
- Ensure port 5173 is available
- Check that backend is running on port 3000
- Verify CORS configuration in backend

### Build Failures
- Clear node_modules and reinstall: `rm -rf node_modules && npm install`
- Check Node.js version: `node --version`
- Review TypeScript errors: `npm run build`

### Authentication Issues
- Check localStorage for valid token
- Verify token hasn't expired
- Ensure backend JWT_SECRET matches

## License

MIT License - See LICENSE file in project root
