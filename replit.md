# Igreja Comunidade - Portal da Igreja

## Overview
Complete church website with public pages, secure member area, and administrative panel. Built with React, TypeScript, Express, and PostgreSQL. Admins access the member interface with additional administrative options.

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
- **users**: Members and administrators (with ministerioLouvor, ministerioObreiro boolean fields and isLider)
- **events**: Church events (public)
- **courses**: Educational courses
- **lessons**: Course lessons (video-based)
- **questions**: Quiz questions for lessons (3 per lesson with multiple choice)
- **lesson_completions**: Tracks lesson completions and quiz scores
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
- **Courses with quiz system**
  - Video lessons with YouTube embed
  - 3-question quiz per lesson (multiple choice)
  - Must answer all correctly to complete lesson
  - Retry mechanism for incorrect answers
  - Completion tracking with trophy badge
- PDF materials access
- Private YouTube videos
- User profile view
- **Ministry-based schedule viewer**
  - Members with Louvor ministry see only worship schedules
  - Members with Obreiro ministry see only workers schedules
  - Members with no ministry see informative message
  - Members with both ministries see both schedules
- Sidebar navigation with admin access for administrators

### Leader Area (/lider)
- Schedule management (leaders & admins only)
- Create/edit worship schedules
- Assign members to positions: Teclado, Violão, Baixo, Bateria, Voz, Backing
- Create/edit workers schedules
- Ministry-based member suggestions

### Admin Panel (/admin)
- Accessible to administrators through member sidebar link "Painel Admin"
- Admins see member interface first, then access admin panel as needed
- **Member management** (full CRUD operations)
  - Create new members with all fields
  - **Ministry checkboxes**: Assign members to Louvor and/or Obreiro ministries independently
  - Edit existing members (name, email, password, birthdate, profession, address, ministries, leader/admin status)
  - Optional password update (empty preserves current password)
  - Delete members
  - Toggle admin permissions
  - Filters by neighborhood and profession
  - CSV export functionality
- **Course & lesson management with quiz system**
  - Create/edit courses and lessons
  - Quiz editor: 3 questions per lesson with A/B/C options
  - Correct answer selection per question
  - Visual indicators for quiz configuration status
- Event management
- Materials management (PDFs & videos)
- Prayer request moderation
- **Analytics dashboard**
  - Demographics charts (age, neighborhood, profession)
  - Course completion metrics (total lessons, completions, rates)
  - Per-course statistics with progress bars
  - Students started vs completed tracking
- Role-based access control
- Top navigation layout

## Authentication
- JWT tokens stored in localStorage
- bcrypt password hashing
- Route protection middleware
- Unified member/admin interface (admins access /membro with additional admin panel link)

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
PATCH  /api/admin/members/:id              # Edit member (all fields optional, empty strings sanitized)
PATCH  /api/admin/members/:id/toggle-admin
DELETE /api/admin/members/:id
POST   /api/admin/courses
DELETE /api/admin/courses/:id
POST   /api/admin/lessons
DELETE /api/admin/lessons/:id
GET    /api/admin/events
POST   /api/admin/events
DELETE /api/admin/events/:id
POST   /api/admin/materials
DELETE /api/admin/materials/:id
GET    /api/lessons/:id/questions          # Get quiz questions for a lesson
POST   /api/admin/lessons/:id/questions    # Create/update quiz (3 questions)
POST   /api/lessons/:id/complete           # Submit quiz answers
GET    /api/lessons/:id/completion         # Get lesson completion status
GET    /api/admin/analytics/courses        # Course completion analytics
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
- **Ministry Checkbox System** (October 2024): 
  - Replaced single ministry dropdown with independent checkboxes for Louvor and Obreiro
  - Members can now belong to multiple ministries simultaneously
  - Schedule filtering: members see only schedules relevant to their assigned ministries
  - Database migration: ministerio text field → ministerioLouvor and ministerioObreiro booleans
- **Unified Admin/Member Navigation** (October 2024):
  - Admins now redirect to /membro after login (same interface as members)
  - Admin sidebar shows additional "Administração" section with "Painel Admin" link
  - Maintains all admin functionality while providing unified UX
- **Quiz System** (October 2024): Complete quiz system for lesson validation
  - Database schema with questions and lesson_completions tables
  - Admin interface for managing 3 questions per lesson
  - Member interface with answer validation and retry mechanism
  - Quiz must be completed (all correct) to mark lesson as done
  - Optimized analytics with O(n) performance for course progress tracking
- **Course Analytics Dashboard** (October 2024): Comprehensive analytics on admin dashboard
  - Total lessons and completions metrics
  - Average completion rate across all courses
  - Per-course statistics with progress visualization
  - Students started vs completed tracking
- **Member Editing Feature** (December 2024): Admins can now fully edit member information
  - Edit dialog with all user fields (name, email, password, birthdate, profession, address, etc.)
  - Optional password update - empty password field preserves existing password
  - Backend sanitization of empty strings for optional fields (prevents database errors)
  - Ministry and leader status assignment during edit
  - Form validation with Zod schema
  - End-to-end tested with Playwright
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
