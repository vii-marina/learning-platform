# EduCat — AI-Powered Learning Platform

EduCat is a full-stack learning management platform for creating and completing programming courses. It supports role-based dashboards for students, teachers, and administrators, with tools for course building, structured lessons, tests, coding exercises, progress tracking, teacher analytics, admin management, and AI-assisted generation of tests and exercises.

## Live Demo

https://educat-learning-platform.vercel.app/

## Project Status

EduCat is an MVP and active development project. The core platform is implemented and deployed, including authentication, role-based dashboards, course creation, student learning flows, admin tools, progress tracking, and backend AI generation. Further product, UX, analytics, and learning-experience improvements are planned.

## Key Features

### Public Landing Page

- Product overview for the learning platform
- Dedicated sections for students and teachers, each mirroring that role's real dashboard
- Interactive course preview: visitors can answer a real test without registering
- The previewed course is chosen by an admin and served from a prepared snapshot row, so the
  landing does not wait on the backend to wake up
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

The frontend handles the user interface, routing, dashboards, public landing page, course learning flow, course builder, and admin interface. It uses Supabase Auth for user sessions.

The backend handles secure business logic, AI generation, request validation, admin operations, progress saving, dashboard statistics, landing preview settings, and secure access to OpenAI and Supabase service-role operations.

Sensitive keys, including the Supabase service-role key and OpenAI API key, are stored only on the backend and are never exposed in frontend code.

### Data path: writes through the backend, reads direct

The platform deliberately uses two paths to the database, and the distinction matters when reading
the code:

- **Writes go through the backend.** Every mutation of course content, progress, and user data is an
  Express endpoint that authenticates the caller, checks ownership, and then writes with the
  service-role key. The browser never writes to Supabase directly.
- **Course-content reads go straight from the browser to Supabase**, using the anon key under Row
  Level Security. This keeps reading a course off the backend's critical path.

Row Level Security is the backstop rather than the primary control: on the course-content tables the
policies allow `SELECT` only, so even a forged client request cannot write. Authorization proper
lives in the backend, which means access control is enforced in two independent places.

Tests come in two modes. A **practice** test sends its answers to the client, which checks them
locally so the student gets an instant result. A **graded** test withholds the answers entirely and
is scored on the server when the student submits.

Coding exercises are currently the exception: they still send the expected answer to the browser and
are checked there. Moving that check to the server is known work, not a design choice.

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
- `user_test_results`
- `user_exercise_results`
- `landing_page_settings`
- `landing_preview_snapshot`

Two further tables, `user_courses` and `course_access_list`, are not referenced by application code.
They are kept because the `can_read_course()` RLS function reads them to gate direct client access to
published courses, so dropping them would break Row Level Security. Enrollment itself is recorded in
`course_progress`.

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
├── frontend/            # Frontend application source
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
│   ├── tests/           # Backend tests, kept outside src so dist/ stays clean
│   └── scripts/         # Helper SQL and maintenance scripts
├── brand/               # Logo masters and derived icon alternates
├── public/              # Static public assets and the shipped icon set
├── .github/workflows/   # CI: lint, typecheck, test, and build
├── package.json         # Frontend dependencies and scripts
├── vite.config.ts       # Frontend build and test configuration
├── vercel.json          # Frontend deployment configuration
└── README.md
```

The frontend source lives in `frontend/`, but its tooling configuration (`package.json`,
`vite.config.ts`, `tailwind.config.js`, `index.html`) sits at the repository root.

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
OPENAI_MODEL=
PORT=
CORS_ORIGIN=
NODE_ENV=
LOG_LEVEL=
```

`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `OPENAI_API_KEY`, and `CORS_ORIGIN` are required; the
process refuses to start without them. The rest have defaults: `OPENAI_MODEL` is `gpt-4o-mini`,
`PORT` is `4000`, `NODE_ENV` is `development`, and `LOG_LEVEL` is `debug` in development and `info`
otherwise.

`CORS_ORIGIN` accepts a comma-separated list of allowed origins.

The model named in `OPENAI_MODEL` must support structured outputs, because both generators request a
strict JSON schema rather than parsing free text.

## Testing and CI

Both packages use Vitest.

```bash
npm test              # frontend, from the repository root
npm run test:watch

cd backend
npm test              # backend
npm run typecheck     # source
npm run typecheck:tests
```

The tests are hermetic by construction: no test reaches the database, Supabase, or OpenAI. Backend
tests either exercise pure modules or run against a mocked Supabase client, and frontend component
tests run in jsdom. This is what makes them safe to run against a repository whose only database is
production.

GitHub Actions runs lint, both typechecks, both test suites, and both builds on every push to `main`
and on every pull request.

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
Supported by Volodymyr Mykhailiuk.