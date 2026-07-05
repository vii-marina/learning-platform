# EduCat — AI-Powered Learning Platform

EduCat is a full-stack learning management platform for creating and completing programming courses. It supports role-based dashboards for students, teachers, and administrators, with tools for course building, structured lessons, tests, coding exercises, progress tracking, teacher analytics, admin management, and AI-assisted generation of tests and exercises.

## Live Demo

https://educat-learning-platform.vercel.app/

## Demo Accounts

Teacher account:
- Email: python@gmail.com
- Password: 111111

Student account:
- Email: student@gmail.com
- Password: 111111

Admin credentials are not shared publicly for security reasons.

## Project Status

EduCat is an MVP and active development project. The core platform is implemented and deployed, including authentication, role-based dashboards, course creation, student learning flows, admin tools, progress tracking, and backend AI generation. Further product, UX, analytics, and learning-experience improvements are planned.

## Key Features

### Public Landing Page

- Product overview for the learning platform
- Dedicated sections for students and teachers
- Dynamic course preview managed from the admin dashboard
- FAQ section
- Authentication entry points

### Authentication and Roles

- Supabase Auth
- Email confirmation
- Role-based access control
- Separate dashboards for students, teachers, and super-admin users

### Student Features

- Browse published courses
- Enroll in courses
- Continue started courses
- View enrolled and completed courses
- Open lessons, tests, and exercises
- Track total course progress
- Track progress separately by lessons, tests, and exercises
- View teacher profiles
- Edit student profile

### Teacher Features

- Teacher dashboard
- Create, edit, publish, unpublish, and archive courses
- Build course structure with modules, lessons, tests, and exercises
- Add formatted lesson content using a rich text editor
- Add video links to lessons
- Upload course thumbnails and media files
- Create tests manually or with AI
- Create coding exercises manually or with AI
- Preview courses before publishing
- View students grouped by course
- Track student progress and test results
- Edit teacher profile

### Admin Features

- Admin dashboard
- Manage teachers
- Manage students
- Edit student and teacher profiles
- View student enrollments and learning progress
- Manage published courses
- Unpublish, archive, or delete courses
- View course statistics
- Configure the dynamic landing page preview content

## Tech Stack

### Frontend

- React 19
- TypeScript
- Vite
- React Router 7
- Tailwind CSS
- Supabase JS Client
- TipTap
- Lucide React
- Lottie

### Backend

- Node.js
- Express 5
- TypeScript
- Zod
- OpenAI SDK
- Supabase service-role client

### Database and Infrastructure

- Supabase Auth
- Supabase PostgreSQL
- Supabase Storage
- Vercel for frontend deployment
- Render for backend deployment
- Git and GitHub

## Architecture Overview

EduCat uses a full-stack client-server architecture.

The frontend handles the user interface, routing, dashboards, public landing page, course learning flow, course builder, and admin interface. It uses Supabase Auth for user sessions and communicates with the backend for protected operations.

The backend handles secure business logic, AI generation, request validation, admin operations, progress saving, dashboard statistics, landing preview settings, and secure access to OpenAI and Supabase service-role operations.

Sensitive keys, including the Supabase service-role key and OpenAI API key, are stored only on the backend and are never exposed in frontend code.

## Core User Flows

### Student

1. Sign in or create an account.
2. Browse published courses.
3. Enroll in a course.
4. Open lessons, tests, and exercises.
5. Complete learning activities.
6. Track progress.

### Teacher

1. Sign in as a teacher.
2. Create a course.
3. Add course information and thumbnail.
4. Build modules and lessons.
5. Add tests and exercises.
6. Use AI generation if needed.
7. Preview and publish the course.
8. Track student progress.

### Admin

1. Sign in as an administrator.
2. Manage teachers, students, and courses.
3. Review student progress and course activity.
4. Configure landing page preview content.

## Database Overview

The platform uses Supabase PostgreSQL as the primary database. Main entities include:

- `profiles`
- `student_profiles`
- `teacher_profiles`
- `admins`
- `courses`
- `modules`
- `lessons`
- `lesson_blocks`
- `test_entities`
- `test_questions`
- `test_answers`
- `exercises`
- `exercise_content`
- `course_progress`
- `lesson_progress`
- `lesson_views`
- `user_test_results`
- `user_exercise_results`
- `user_courses`
- `course_access_list`
- `landing_page_settings`

Supabase Storage is used for course thumbnails, lesson media, and user profile assets.

## AI Functionality

The AI module is implemented on the backend using the OpenAI SDK. It can generate draft learning content for teachers, including:

- Test questions
- Programming exercises
- True / false questions
- Single choice questions
- Multiple choice questions
- Fill missing code exercises
- Write code exercises

Generated AI content is shown as a draft first. Teachers can review, edit, and save generated content manually. AI does not publish content automatically.

## Project Structure

```text
learning-platform/
├── src/                 # Frontend application source
│   ├── app/             # Application entry and routing setup
│   ├── components/      # Shared UI and layout components
│   ├── features/        # Feature modules for auth, courses, dashboards, and admin tools
│   ├── lib/             # Shared frontend clients and helpers
│   ├── pages/           # Route-level pages
│   └── styles/          # Global styles
├── backend/
│   ├── src/             # Express API source
│   │   ├── config/      # Environment configuration
│   │   ├── controllers/ # Request handlers
│   │   ├── lib/         # Backend clients and shared utilities
│   │   ├── middleware/  # Auth, role, error, and not-found middleware
│   │   ├── routes/      # API route definitions
│   │   ├── services/    # Business logic, AI generation, dashboards, and persistence
│   │   └── validators/  # Zod schemas
│   └── scripts/         # Helper SQL and maintenance scripts
├── public/              # Static public assets
├── package.json         # Frontend dependencies and scripts
├── vercel.json          # Frontend deployment configuration
└── README.md
```

## Getting Started

### Frontend

```bash
npm install
npm run dev
```

### Backend

```bash
cd backend
npm install
npm run dev
```

## Environment Variables

Create local environment files for the frontend and backend. Do not commit real secrets.

### Frontend

```env
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_BACKEND_URL=
```

### Backend

```env
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
OPENAI_API_KEY=
PORT=
CORS_ORIGIN=
```

Do not expose service-role keys or OpenAI API keys in frontend code.

## Roadmap

- Browser-based code runner
- More coding exercise types
- Advanced teacher analytics
- Student notifications
- Course certificates
- Better course search and filtering
- Improved onboarding
- Expanded AI generation for course content
- Public product polishing for real users

## Author

Developed by Marina Vilkhovetska.
