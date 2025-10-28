# Igreja Comunidade - Portal da Igreja

## Overview
Complete church website with public pages, secure member area, and administrative panel. Built with React, TypeScript, Express, and PostgreSQL.

## Project Structure
```
├── client/src/
│   ├── pages/           # All page components
│   │   ├── home.tsx              # Public homepage
│   │   ├── login.tsx             # Member login
│   │   ├── member-dashboard.tsx  # Member dashboard
│   │   ├── member-courses.tsx    # Course viewer
│   │   ├── member-materials.tsx  # PDF materials
│   │   ├── member-videos.tsx     # Private videos
│   │   ├── member-profile.tsx    # User profile
│   │   ├── admin-dashboard.tsx   # Admin overview
│   │   ├── admin-members.tsx     # Member management
│   │   ├── admin-courses.tsx     # Course management
│   │   ├── admin-events.tsx      # Event management
│   │   └── admin-materials.tsx   # Materials management
│   ├── components/      # Reusable components
│   │   ├── ui/                   # Shadcn components
│   │   ├── app-sidebar.tsx       # Member sidebar
│   │   ├── member-layout.tsx     # Member wrapper
│   │   └── admin-layout.tsx      # Admin wrapper
│   └── App.tsx          # Main router
├── server/
│   ├── routes.ts        # API endpoints
│   ├── storage.ts       # Database operations
│   └── db.ts            # Database connection
└── shared/
    └── schema.ts        # Data models & types
```

## Database Schema
- **users**: Members and administrators (with ministerio and isLider fields)
- **events**: Church events (public)
- **courses**: Educational courses
- **lessons**: Course lessons (video-based)
- **materials**: PDFs and private videos
- **prayer_requests**: Prayer requests system
- **schedules**: Monthly schedules (louvor & obreiros)
- **schedule_assignments**: Assignments of members to positions
- **notifications**: User notifications (pending implementation)

## Features

### Public Site (/)
- Hero section with church image
- About section with mission
- Worship schedule (Wednes day & Sunday)
- Upcoming events showcase
- Contact information with Google Maps
- Fully responsive design

### Member Area (/membro)
- Protected routes (JWT authentication)
- Dashboard with stats
- Courses with video lessons
- PDF materials access
- Private YouTube videos
- User profile view
- Monthly schedules viewer (louvor & obreiros)
- Sidebar navigation

### Leader Area (/lider)
- Schedule management (leaders & admins only)
- Create/edit worship schedules
- Assign members to positions: Teclado, Violão, Baixo, Bateria, Voz, Backing
- Create/edit workers schedules
- Ministry-based member suggestions

### Admin Panel (/admin)
- Member management (CRUD, filters, CSV export, ministry/leader assignment)
- Course & lesson management
- Event management
- Materials management (PDFs & videos)
- Prayer request moderation
- Analytics dashboard with demographics charts
- Role-based access control
- Top navigation layout

## Authentication
- JWT tokens stored in localStorage
- bcrypt password hashing
- Route protection middleware
- Separate member/admin access

## Design System
- Colors: Blue (#2563eb), Gold (#fbbf24), White
- Fonts: Poppins (headings), Inter (body)
- Shadcn UI components
- Consistent spacing and elevation
- Dark mode support
- Fully responsive

## API Routes
```
POST   /api/auth/login
GET    /api/events/public
GET    /api/courses
GET    /api/courses/:id/lessons
GET    /api/materials
GET    /api/admin/members
POST   /api/admin/members
DELETE /api/admin/members/:id
PATCH  /api/admin/members/:id/toggle-admin
POST   /api/admin/courses
DELETE /api/admin/courses/:id
POST   /api/admin/lessons
DELETE /api/admin/lessons/:id
GET    /api/admin/events
POST   /api/admin/events
DELETE /api/admin/events/:id
POST   /api/admin/materials
DELETE /api/admin/materials/:id
```

## Development Notes
- Run `npm run db:push` to sync database schema
- First user must be created via admin panel or database
- YouTube URLs are automatically converted to embeds
- CSV export uses client-side generation
- All images stored as URLs (not file uploads)

## Default Admin Setup
To create the first admin user, insert directly into database or use the create member form with admin checkbox.

## Recent Changes
- **Monthly Schedule System**: Complete workflow for worship and workers schedules
  - Leaders can create and manage schedules
  - Assign members to specific positions (Teclado, Violão, Baixo, Bateria, Voz, Backing)
  - Ministry-based suggestions for easier assignment
  - Members can view their schedules
- **Prayer Request System**: Public submission, admin moderation, public display
- **Analytics Dashboard**: Member demographics with age, neighborhood, and profession charts (Recharts)
- **User Roles**: Added ministerio (ministry) and isLider (leader) fields
- Complete database schema with relations
- Design system configured (blue, gold, white)
- All components use Shadcn UI patterns
