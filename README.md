# Hive

**Connecting people with purpose through hyperlocal volunteering.**

Hive is a community volunteering and event management platform that connects volunteers with Non-Governmental Organizations (NGOs). Volunteers discover nearby missions, check in on site, earn recognition, and build an impact history. NGOs run events, track attendance, gather feedback, and export impact reports. Admins verify organizations and maintain an audit trail for sensitive actions.

Repository: [github.com/lisorthman/Hive](https://github.com/lisorthman/Hive)

## Features

### Volunteers
- Browse and filter events on a map (OpenStreetMap + Nominatim geocoding)
- Join missions or join a **waitlist** when events are full
- **Email verification** before first login (dev mode prints the link in the backend console)
- Profile with interests, skills, availability, and bio
- QR / code **check-in**, badges, **leaderboard**, and digital **impact resume**
- **Reviews** (after verified attendance) and threaded **event discussions**

### NGOs
- Create and manage events with map-based location search and pin placement
- Attendance management, check-in codes, and volunteer notifications
- **Mission hub** per event (stats, discussion moderation context)
- Public **NGO profile** (verified organizations only)
- Volunteer feedback summary on the dashboard
- **Impact report export** (CSV or PDF): attendance, hours, ratings, and event list

### Admins
- Approve or reject NGO registrations (document upload on register)
- **Audit log**: NGO status changes, admin comment deletions, and event deletions (who, what, when, SHA-256 payload hash)

## Tech stack

| Layer | Stack |
|-------|--------|
| Frontend | React 19, Vite, TypeScript, Tailwind CSS, Leaflet, React Router |
| Backend | Node.js, Express 5, Mongoose, JWT, Multer |
| Database | MongoDB |
| Maps | OpenStreetMap tiles, Nominatim (no API key required) |

## Project structure

```
Hive/
├── backend/          # REST API (port 5001 by default)
│   ├── controllers/
│   ├── models/
│   ├── routes/
│   ├── utils/
│   └── scripts/      # seed admin, seed events, etc.
└── frontend/         # Vite app (port 5173)
    └── src/
        ├── pages/
        ├── components/
        └── lib/      # API clients
```

## Getting started

### Prerequisites
- Node.js 18+
- npm
- MongoDB (local instance or [MongoDB Atlas](https://www.mongodb.com/atlas) URI)

### 1. Backend

```bash
cd backend
npm install
```

Create `backend/.env`:

```env
MONGO_URI=mongodb://127.0.0.1:27017/hive
JWT_SECRET=your_jwt_secret_here
JWT_EXPIRE=30d
PORT=5001
NODE_ENV=development
FRONTEND_URL=http://localhost:5173
```

```bash
npm run dev
```

Optional — seed an admin user (adjust script if needed):

```bash
node scripts/seedAdmin.js
```

### 2. Frontend

```bash
cd frontend
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173). The frontend expects the API at `http://127.0.0.1:5001/api` (see `frontend/src/lib/auth.ts`).

### Production build (frontend)

```bash
cd frontend
npm run build
npm run preview
```

## Main routes (UI)

| Path | Description |
|------|-------------|
| `/` | Landing |
| `/discovery` | Event map and list |
| `/event/:id` | Event detail, join/leave, reviews, discussion |
| `/dashboard` | Volunteer home |
| `/profile` | Volunteer profile |
| `/leaderboard` | Gamification leaderboard |
| `/resume` | Impact resume |
| `/ngo-dashboard` | NGO organization dashboard |
| `/ngo-create`, `/ngo-edit/:id` | Create or edit event |
| `/ngo-mission/:id` | NGO mission hub |
| `/ngo-attendance/:id` | Attendance management |
| `/ngo/:id` | Public NGO profile |
| `/admin` | Admin dashboard and audit log |
| `/verify` | Email verification (`?token=...`) |

## API overview

| Prefix | Purpose |
|--------|---------|
| `/api/auth` | Register, login, profile, email verification |
| `/api/events` | CRUD, join, leave, waitlist |
| `/api/attendance` | Check-in, stats, NGO attendance tools |
| `/api/reviews` | Event reviews and NGO summary |
| `/api/comments` | Threaded event discussion |
| `/api/notifications` | In-app notifications |
| `/api/ngos` | Public NGO profiles and events |
| `/api/reports` | NGO impact report (`GET /impact?format=csv\|pdf`) |
| `/api/admin` | NGO verification, audit logs |

All protected routes use `Authorization: Bearer <token>`.

## Development notes

- **Volunteer email verification**: After register or resend, copy the verification URL from the backend terminal when `NODE_ENV` is not `production`.
- **NGO registration**: Requires a verification document (PDF); admins approve via `/admin`.
- **Maps**: Respect [Nominatim usage policy](https://operations.osmfoundation.org/policies/nominatim/) for geocoding in production (rate limits, attribution).
- Uploaded NGO documents are served from `/uploads` on the backend.

## License

This project is developed as part of a Software Requirements Specification for community engagement.
