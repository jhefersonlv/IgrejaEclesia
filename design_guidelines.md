# Church Website Design Guidelines

## Design Approach

**Selected Framework**: Hybrid approach combining reference-based design for public pages with system-based design for admin functionality. Drawing inspiration from modern church websites like Elevation Church and Hillsong, while utilizing established patterns for data management interfaces.

**Core Design Principles**:
- Welcoming and inclusive visual language
- Clear hierarchy between sacred/community content and functional elements
- Professional yet approachable aesthetic
- Trust-building through thoughtful imagery and typography

## Typography

**Font Families** (via Google Fonts CDN):
- Primary: 'Poppins' - Headings, navigation, buttons
- Secondary: 'Inter' - Body text, forms, data tables

**Type Scale**:
- Hero Headlines: text-5xl to text-6xl, font-semibold
- Section Headers: text-3xl to text-4xl, font-semibold
- Subsection Headers: text-xl to text-2xl, font-medium
- Body Text: text-base to text-lg, font-normal
- Small Text/Captions: text-sm, font-normal

## Layout System

**Spacing Primitives**: Consistent use of Tailwind units: 2, 4, 6, 8, 12, 16, 20, 24 for padding/margins
**Container Strategy**: max-w-7xl for main content, max-w-4xl for text-focused sections
**Grid System**: 12-column grid for desktop, collapsing to single column on mobile

## Page-Specific Design Specifications

### Homepage (Public)

**Hero Section**:
- Full-width hero with large background image (church exterior or worship scene)
- Height: 85vh minimum
- Overlay: Subtle dark gradient (top-to-bottom) for text legibility
- Content: Centered layout with church name (text-6xl), welcoming tagline (text-xl), primary CTA button
- Button treatment: Backdrop blur (backdrop-blur-md) with semi-transparent background

**About Section**:
- Two-column layout (60/40 split) on desktop
- Left: Text content with heading and 2-3 paragraphs
- Right: Image collage (2-3 smaller images in grid)
- Mobile: Stacked single column

**Worship Schedule Section**:
- Card-based layout (2-column on tablet, 3-column on desktop)
- Each card: Day, service name, time, brief description
- Icon integration: Clock/calendar icons from Heroicons

**Upcoming Events Section**:
- Horizontal scrolling card carousel on mobile, 3-column grid on desktop
- Each event card: Featured image, title, date badge, location, short description, "Learn More" link
- Cards elevated with subtle shadow (shadow-lg)

**Footer**:
- Three-column layout: Contact info, Quick Links, Google Maps embed
- Full-width on mobile (stacked sections)
- Social media icons row
- Spacing: py-16 section padding

### Login Page

**Layout**: Centered card design (max-w-md) with generous whitespace
**Card Structure**: 
- Church logo at top
- "Member Login" heading (text-3xl)
- Form fields with labels above inputs
- "Remember Me" checkbox
- Primary action button (full-width)
- Spacing: p-8 card padding, gap-6 between form elements

### Member Area (/membro)

**Navigation**: Persistent left sidebar (w-64) on desktop, collapsible hamburger on mobile
**Sidebar Contents**:
- Member name and welcome message at top
- Icon-based navigation menu (Heroicons)
- Logout button at bottom

**Dashboard Layout**:
- Welcome banner with member name (py-8)
- Stats cards row (3-column grid): Total Courses, Completed Lessons, New Content count
- Recent content grid below (2-column on tablet, 3-column on desktop)

**Content Pages (PDFs/Videos)**:
- List view with thumbnail/icon, title, description, access button
- Filtering/search bar at top
- Generous spacing between items (gap-6)

### Courses Section

**Course Listing**:
- Card grid (2-column tablet, 3-column desktop)
- Each card: Course image, title, description snippet, lesson count, progress indicator, "Continue" button

**Course Detail Page**:
- Two-column layout: Left sidebar with module/lesson list, Right main content area with video player
- Video player: 16:9 aspect ratio, full-width of content area
- Lesson title above player (text-2xl)
- Description below player
- Module accordion in sidebar

### Admin Panel

**Dashboard**: Data-focused with metrics cards and quick actions
**Layout**: Top navigation bar + content area (no sidebar for admin to maximize space)
**Member Management**:
- Data table with sortable columns, search, filters
- Action buttons: inline edit/delete icons
- "Add Member" primary button (top-right)
- Filter pills above table (age range, neighborhood, profession)

**Forms** (Create/Edit):
- Single column form layout (max-w-2xl)
- Grouped sections with headers
- Two-column layout for related short fields (city/neighborhood)
- Clear save/cancel actions at bottom

## Component Library

**Buttons**:
- Primary: Solid fill, rounded-lg, px-6 py-3, text-base
- Secondary: Border outline, same dimensions
- Text: No background, underline on hover

**Cards**:
- Background with border or subtle shadow
- Rounded corners (rounded-xl)
- Padding: p-6 for content cards

**Form Inputs**:
- Full-width within containers
- Border with focus ring
- Rounded corners (rounded-lg)
- Height: h-12 for text inputs
- Label spacing: mb-2 above input

**Navigation**:
- Horizontal top nav for public pages (sticky)
- Items: gap-8 spacing
- Active state: underline or background highlight

**Modal/Overlays**:
- Centered overlay with backdrop blur
- Max-width constraints (max-w-lg for small, max-w-4xl for large)
- Close button top-right

## Images

**Required Images**:
1. **Hero Image**: Full-width church exterior or worship moment (modern, bright, welcoming)
2. **About Section Collage**: 2-3 images showing community, worship, fellowship
3. **Event Images**: Featured image for each event card (4-6 placeholder events)
4. **Course Thumbnails**: Representative image per course
5. **Footer**: Optional small decorative element or pattern

**Image Treatment**: 
- All images with subtle rounded corners (rounded-lg)
- Hero maintains aspect ratio across viewports
- Event/course images: aspect-video for consistency

## Animations

**Minimal Approach**:
- Smooth page transitions (no aggressive animations)
- Subtle hover states on cards (slight elevation increase)
- Form feedback (success/error states)
- No scroll-triggered animations

## Accessibility

- Semantic HTML structure throughout
- ARIA labels for icon-only buttons
- Keyboard navigation support for all interactive elements
- Form inputs with associated labels
- Color contrast ratios meeting WCAG AA standards
- Focus indicators visible on all interactive elements