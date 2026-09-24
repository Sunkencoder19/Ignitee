# IGNITE — Frontend Project Plan

## How to work in this repo (read first)

- Work **one checkpoint at a time** from "Build order" below. Never start the next checkpoint until the user says "next".
- Before writing code for a checkpoint, list the files you'll create and the commands you'll run, then wait for the user's OK.
- Follow this doc exactly: palette tokens, folder structure, file names, pinned versions.
- After each checkpoint: `npm run build` must pass, `npm run dev` must show no console errors. Tell the user what URL/page to open to verify, then stop.
- Commit with a plain, human message and push to GitHub at the end of each checkpoint.
- No backend. All data comes from `src/data/*.json` through `src/services/`.

## Overview

IGNITE v1 is a frontend-only React app for CBSE Class 4 Maths, in English, with two roles: student and teacher. There is no backend yet. All data comes from local JSON behind an async service layer, so a real API can replace it later without touching components.

| Item | Decision |
| --- | --- |
| Learners | Class 4 students, roughly 9 years old, rural schools |
| Subject | Mathematics, CBSE / NCERT Class 4 |
| Language | English only (Marathi/Hindi in future scope) |
| Roles | Student, Teacher (role picked at a fake login) |
| Devices | Low-end Android phones first, then school desktops |
| Persistence | localStorage for progress, so a demo survives a refresh |

Design constraint that drives everything: the main user is a 9-year-old on a small, cheap phone with patchy data. Big tap targets, short sentences, icons next to every label, and nothing heavier than it needs to be.

## Tech stack

Vite + React 18 + React Router + Tailwind, and very little else. Every extra library is one more thing to justify in a viva.

| Layer | Choice | Why |
| --- | --- | --- |
| Build tool | Vite | Fast dev server, standard for new React projects (CRA is deprecated) |
| UI | React 18, `.jsx` files | Required; function components and hooks only |
| Routing | react-router-dom v6 | Nested layouts for student vs teacher areas, protected routes |
| Styling | Tailwind CSS 3 | Palette lives in `tailwind.config.js`, no scattered hex codes |
| Charts | Recharts 2 | Teacher dashboard progress charts; small API, React-native |
| Icons | lucide-react | Consistent line icons, tree-shaken |
| State | Context + `useReducer` | Enough for auth, progress and points; no Redux needed |
| Lint/format | ESLint + Prettier | Consistent code, shows discipline |

Deliberately not used: Redux, a UI kit like MUI or shadcn, and animation libraries. A UI kit is the fastest way to make the app look template-made. Small transitions come from Tailwind utilities.

## Colour palette and design language

The palette follows the name: a warm "ember" orange as the brand colour, deep indigo for text and structure, on a cream background instead of stark white. Warm, friendly, readable in sunlight on a cheap screen, and not the default blue-purple SaaS look.

| Token | Hex | Used for |
| --- | --- | --- |
| `ember-500` | #F97316 | Brand accents, progress bars, active nav icon |
| `ember-700` | #C2410C | Primary buttons with white text (passes AA contrast) |
| `ink-900` | #1E1B4B | Headings, sidebar, strong text |
| `ink-600` | #4B4A6B | Body text |
| `cream-50` | #FFF8EE | App background |
| `paper` | #FFFFFF | Cards, sitting on cream |
| `sun-400` | #FACC15 | Points, coins, star ratings |
| `leaf-600` | #16A34A | Correct answer, completed lesson, success toasts |
| `sky-500` | #0EA5E9 | Info, hints, teacher-side accent |
| `berry-600` | #E11D48 | Errors only, used sparingly |
| `amber-500` | #F59E0B | Wrong-answer borders and fills ("Try again") |
| `amber-700` | #B45309 | Wrong-answer text on white (passes AA contrast) |

Design rules:

- **Typography:** Baloo 2 for headings, Nunito for body. Baloo 2 is designed in India and supports Devanagari, so Hindi or Marathi later needs no font change.
- **Sizes:** body 16–18px on student screens, tap targets at least 48px tall, one main action per screen.
- **Shapes:** rounded-2xl cards, soft shadows, 8px spacing grid.
- **Wrong answers:** shown in amber with "Try again", not red. Red feels like punishment to a 9-year-old.
- **Two moods, one system:** student side is playful (illustrations, bigger type, bottom nav on mobile); teacher side is calmer and denser (sidebar, tables, charts) using the same tokens.
- **Chapter colours:** each chapter card gets one tint from the palette so kids recognise chapters by colour as well as title.

## Project scaffolding

Organise by feature, not by file type. Each feature folder owns its pages and the components only it uses; `components/` holds only what is shared by two or more features.

```
ignite/
├─ public/
│  └─ favicon.svg
├─ src/
│  ├─ main.jsx                 # ReactDOM root, providers
│  ├─ App.jsx                  # route table only
│  ├─ assets/
│  │  ├─ badges/               # badge SVGs
│  │  └─ illustrations/
│  ├─ components/              # shared UI
│  │  ├─ ui/                   # Button, Card, Modal, ProgressBar, EmptyState
│  │  └─ layout/               # StudentLayout, TeacherLayout, Navbar
│  ├─ features/
│  │  ├─ auth/                 # LoginPage, RequireRole
│  │  ├─ learn/                # SubjectMap, ChapterPage, LessonPlayer
│  │  ├─ quiz/                 # QuizPage, QuestionCard, ResultScreen
│  │  ├─ student-dashboard/
│  │  ├─ teacher-dashboard/    # Overview, ClassTable, StudentDetail
│  │  ├─ leaderboard/
│  │  └─ profile/              # badges shelf, stats
│  ├─ context/
│  │  ├─ AuthContext.jsx
│  │  └─ ProgressContext.jsx   # points, badges, completed lessons
│  ├─ hooks/                   # useLocalStorage, useQuiz, useFetch ...
│  ├─ services/                # api.js + one file per resource
│  ├─ data/                    # JSON: chapters, lessons, questions, students
│  ├─ lib/                     # pure helpers: scoring.js, badgeRules.js, format.js
│  └─ styles/index.css         # Tailwind directives + font imports
├─ .eslintrc.cjs
├─ .prettierrc
├─ tailwind.config.js
├─ vite.config.js             # '@' alias to src/
└─ README.md
```

Conventions:

- Components and pages in PascalCase `.jsx`; hooks as `useSomething.js`; helpers and services in camelCase `.js`.
- One page = one file, with comment dividers (`// ---- state ----`, `// ---- handlers ----`, `// ---- render ----`). Pull a piece out into its own file only once a second feature needs it.
- Import with the `@/` alias, never `../../../`.
- `lib/` holds plain functions with no React in them, so scoring and badge rules are easy to explain and test.

## Routing map

15 routes across three areas: public, student, teacher. `RequireRole` wraps each private area and redirects to `/login` if the role doesn't match.

| Path | Screen | Role |
| --- | --- | --- |
| `/` | Landing page | Public |
| `/login` | Login + role picker | Public |
| `/student` | Student dashboard | Student |
| `/student/learn` | Chapter map | Student |
| `/student/learn/:chapterId` | Chapter page (lesson list) | Student |
| `/student/learn/:chapterId/:lessonId` | Lesson player | Student |
| `/student/quiz/:quizId` | Quiz | Student |
| `/student/quiz/:quizId/result` | Result + feedback | Student |
| `/student/leaderboard` | Leaderboard | Student |
| `/student/profile` | Badges + stats | Student |
| `/teacher` | Class overview | Teacher |
| `/teacher/students` | Student table | Teacher |
| `/teacher/students/:studentId` | Student detail | Teacher |
| `/teacher/assessments` | Quiz results by chapter | Teacher |
| `*` | Not found | All |

## Modules

All 10 modules from the brief map onto the screens above. Content follows the new NCERT Class 4 book, *Maths Mela* (14 chapters). v1 seeds chapters 1–4 fully; chapters 5–14 appear on the map as locked, so the app looks complete without 14 chapters of content.

| # | Chapter | v1 status |
| --- | --- | --- |
| 1 | Shapes Around Us | Full |
| 2 | Hide and Seek | Full |
| 3 | Pattern Around Us | Full |
| 4 | Thousands Around Us | Full |
| 5 | Sharing and Measuring | Locked |
| 6 | Measuring Length | Locked |
| 7 | The Cleanest Village | Locked |
| 8 | Weigh it, Pour it | Locked |
| 9 | Equal Groups | Locked |
| 10 | Elephants, Tigers and Leopards | Locked |
| 11 | Fun with Symmetry | Locked |
| 12 | Ticking Clocks and Turning Calendar | Locked |
| 13 | The Transport Museum | Locked |
| 14 | Data Handling | Locked |

### 1. UI/UX and responsive website

- Landing page: hero with the IGNITE wordmark, three feature tiles (Learn, Earn badges, Track progress), "Start learning" and "I'm a teacher" buttons.
- Student layout: top bar with points and streak; bottom tab bar on mobile (Home, Learn, Ranks, Me), left rail on desktop.
- Teacher layout: fixed ink-900 sidebar, white content area.
- Breakpoints: design at 360px first, then `md` (768) and `lg` (1024).

### 2. User authentication (mocked)

- Login card: two big role tiles (Student / Teacher), then a name dropdown and a 4-digit PIN. A PIN is easier for a 9-year-old than a password.
- `AuthContext` stores the user; `RequireRole` guards routes; logout clears the session.
- Clearly labelled as demo auth in the README.

### 3. Gamified learning system

- Chapter map: a winding path of chapter nodes, each tinted, showing stars earned (0–3). Completed nodes filled, next node pulsing, locked nodes greyed.
- Lesson player: step-by-step cards (explain → example → try it), a progress bar across the top, "Next" as the one big button.
- Activities inside lessons: tap-to-choose, drag-to-order and number input.

### 4. Student dashboard

- Greeting with name and avatar, today's points, current streak.
- "Continue where you left off" card, the single most important element.
- Recently earned badges row; weekly activity strip (7 dots).
- Empty state for a new student: an illustration and "Start your first lesson" button.

### 5. Teacher dashboard

- Four stat tiles: students, average quiz score, lessons completed this week, students inactive for 3+ days.
- Chart: class average score per chapter (bar); activity over the last 14 days (line).
- "Needs attention" list: students below 50% on any chapter.
- Student table: search, sort by points, score or last active; click opens student detail.

### 6. Points, badges and leaderboard

- Points pill in the header that animates when points are added.
- Badge shelf on the profile: earned badges in colour, locked ones as outlines with the rule shown ("Finish 3 lessons").
- Leaderboard: podium for the top 3, list below, current student's row always pinned and highlighted. Toggle: This week / All time.

### 7. Assessment and feedback

- End-of-chapter quiz, 8–10 questions, one per screen, big answer buttons.
- Instant feedback per question: green tick, or amber "Try again" with a hint on the first miss.
- Result screen: stars (1–3), score, points earned, and "Review mistakes" list with the correct answer explained.

### 8. Progress tracking

- Per chapter: lessons done / total, best quiz score, stars.
- Profile stats: total time, lessons, quizzes, accuracy.
- Teacher's student detail page shows the same data per child, plus a chapter-wise score chart.

### 9. Database integration (future-ready)

- No database in v1. Components call `services/*`, which read JSON and write progress to localStorage.
- Swapping in a real backend means changing only `services/` (see Data layer).

### 10. Testing and deployment (after the review)

- Vitest + React Testing Library for `lib/` rules and two or three key components (quiz flow, badge unlock).
- Deploy on Vercel or Netlify from GitHub, with a SPA rewrite so deep links work.
- Lighthouse check on mobile: target 90+ on performance and accessibility.

## Data layer

Components never import JSON directly. They call async functions in `services/`, which return Promises with a short artificial delay. That keeps loading and empty states real, and the backend swap later touches one folder.

Flow: Page / hook → `services/*.js` → `data/*.json` (read-only content) and localStorage (progress, points). Later: `services/` → REST API.

Content model (JSON files in `data/`):

| Entity | Key fields |
| --- | --- |
| Chapter | `id`, `number`, `title`, `tint`, `lessonIds[]`, `quizId`, `locked` |
| Lesson | `id`, `chapterId`, `title`, `steps[]` (type: explain / example / activity) |
| Quiz | `id`, `chapterId`, `questions[]`, `passMark` |
| Question | `id`, `type` (mcq / input / order), `prompt`, `options[]`, `answer`, `hint`, `explanation` |
| Student | `id`, `name`, `avatar`, `pin`, `classId` |
| Badge | `id`, `name`, `icon`, `rule` (key into `lib/badgeRules.js`) |
| Progress | `studentId`, `completedLessons[]`, `quizAttempts[]`, `points`, `badges[]`, `streak`, `lastActive` |

Service files:

- `api.js`: one `request()` wrapper with the delay and error simulation. The only file that changes when a backend arrives.
- `contentService.js`: `getChapters()`, `getBadges()`, `getLesson(id)`, `getQuiz(id)`, `getChapterDetail(id)`.
- `progressService.js`: `getProgress(studentId)`, `saveProgress(studentId, progress)`, `resetDemoData()`. The rules (points, streak, badges) live in ProgressContext's reducer and `lib/`; the service only stores the result.
- `classService.js`: teacher-side reads: `getClassSummary()`, `getStudents()`, `getStudentDetail(id)`.

Seed ~12 students with varied, realistic progress so the teacher dashboard and leaderboard look alive. Mix strong, average, and inactive students, and include one with zero progress to exercise the empty states.

## State and hooks

Two contexts hold global state; everything else stays local to the page that uses it. Each hook below has a specific job, so none of them is there just for show.

Global state:

- `AuthContext`: current user and role. `useState` + `useMemo` for the context value; `login()` and `logout()` wrapped in `useCallback`.
- `ProgressContext`: points, badges, completed lessons, streak. `useReducer` with actions `LESSON_COMPLETED`, `QUIZ_SUBMITTED`, `BADGE_UNLOCKED`. A `useEffect` persists state to localStorage on change.

Built-in hooks and where each earns its place:

| Hook | Where | Why |
| --- | --- | --- |
| `useState` | Everywhere local | Form fields, selected answer, open modal |
| `useReducer` | ProgressContext, quiz flow | Several related values changing together |
| `useEffect` | Data loading, persistence, streak check | Syncing with outside systems only |
| `useContext` | Via `useAuth()` / `useProgress()` wrappers | Never called raw in components |
| `useMemo` | Leaderboard sort, teacher table filter, chart data | Derived data from larger lists |
| `useCallback` | Handlers passed into memoised children | Stable references |
| `useRef` | Quiz timer, focusing the answer input, confetti canvas | Values that shouldn't re-render |
| `useId` | Form label / input pairing | Accessibility |

Custom hooks in `hooks/`:

- `useFetch(serviceFn, deps)`: returns `{ data, loading, error }`; handles cleanup with an `ignore` flag so stale responses are dropped.
- `useLocalStorage(key, initial)`: state that persists, with try/catch around storage.
- `useQuiz(quiz)`: wraps a reducer for current index, answers, attempts per question, score, finished.
- `useBadgeCheck()`: after each progress change, runs `lib/badgeRules.js` and dispatches new unlocks.
- `useMediaQuery(query)`: switches bottom nav vs side rail.
- `useDocumentTitle(title)`: page titles per route.

Extras worth using: `React.lazy` + `Suspense` to split the teacher area from the student bundle, and one `ErrorBoundary` around each layout.

## Gamification rules

Points reward effort and accuracy, not speed. Class 4 kids on shared phones shouldn't lose because they're slower. All rules live in `lib/scoring.js` and `lib/badgeRules.js` as plain functions.

| Action | Points |
| --- | --- |
| Finish a lesson | 20 |
| Correct answer, first try | 10 |
| Correct answer after a hint | 5 |
| Quiz 3 stars (90%+) bonus | 30 |
| Daily streak (per day, cap 7) | 5 × streak day |
| Retry a quiz and improve | 15 |

Stars per quiz: 1 star at 50%, 2 at 75%, 3 at 90%. Chapter unlocks when the previous chapter's quiz reaches 1 star.

Levels: every 250 points is a level, with friendly names (Spark → Flame → Blaze → Bonfire → Star), keeping the IGNITE theme.

| Badge | Rule |
| --- | --- |
| First Step | Complete first lesson |
| Shape Explorer | Finish chapter 1 |
| Pattern Pro | 3 stars on chapter 3 quiz |
| Thousand Club | Finish chapter 4 |
| On Fire | 5-day streak |
| Never Give Up | Improve a quiz score on retry |
| Sharp Mind | 10 first-try correct answers in a row |

Leaderboard: class-only (no strangers), weekly by default so a new or slower student can still reach the top. Shows first name and avatar only.

## Keeping the code human

Code reads as hand-written when it has real decisions in it and consistent habits. It reads as AI-made when it's generic, over-commented, and suspiciously uniform.

- **Build in small commits** with plain messages ("add chapter map path layout", "fix streak reset at midnight"). One giant initial commit is the biggest giveaway.
- **Name things after the domain:** `ChapterMap`, `StarRow`, `awardPoints()`, not `DataComponent`, `handleData`, `Item`.
- **Comment only the why:** "PIN not password: kids forget passwords". Never "// This function handles the click".
- **No emoji in the code or UI copy,** and no "Features" style README with emoji headers.
- **Real copy for kids:** "Nice! You found all the shapes." beats "Congratulations on completing this module!"
- **Consistent patterns:** same page skeleton everywhere (loading → error → empty → content), same prop order, early returns.
- **Keep a few rough edges honest:** a `TODO(fattesing):` for known limits is normal in real projects.
- **README in the author's voice:** what it is, how to run it, what's mocked, what's next. Screenshots, not badges.
- **One consistent icon set** (lucide-react); no mixed stock images.

## Build order

The review is on 25 Sep 2026, so build in 8 checkpoints. One checkpoint per prompt. After each one, run the app, look at it, and commit before moving on. Errors show up while they're still small, and there's always a working version to present.

Starting point: no GitHub repo exists yet. Checkpoint 1 begins with `git init`, a `.gitignore` for Node/Vite (`node_modules`, `dist`, `.env`), creating an empty `ignite` repo on GitHub, and pushing the first commit. Push after every checkpoint so the commit history shows how the project was built.

Rules for every checkpoint:

- Follow this doc exactly: palette tokens, folder structure, file names.
- Pin versions: React 18, react-router-dom 6, Tailwind CSS 3 (v4 drops `tailwind.config.js`), Recharts 2, lucide-react.
- Finish with `npm run dev` showing no console errors and `npm run build` passing.
- Commit with a plain message and push to GitHub before starting the next checkpoint.

| # | Checkpoint | Done when you can see |
| --- | --- | --- |
| 1 | Setup: git init + GitHub repo, Vite, Tailwind tokens + fonts, ESLint/Prettier, `@/` alias, shared UI (Button, Card, ProgressBar, EmptyState, Spinner) | A test page showing every button and card in the palette |
| 2 | Seed data + services: chapters 1–4 (5–14 locked), lessons, quizzes, 12 students, badges; `api.js` with delay | Services return data in the console with a loading delay |
| 3 | Routing + layouts + auth: routes table, StudentLayout, TeacherLayout, login with role tiles + PIN, `RequireRole`, NotFound | Log in as student or teacher, land in the right shell, blocked from the other |
| 4 | Landing page + chapter map + chapter page | Path of chapters with done / active / locked states |
| 5 | Lesson player + quiz + result screen (`useQuiz`) | Finish a lesson and a quiz end to end, see stars and review |
| 6 | ProgressContext + points, levels, badges, streak; localStorage | Points pill updates, badge toast appears, survives refresh |
| 7 | Student dashboard, leaderboard, profile | Continue card, podium with your row pinned, badge shelf |
| 8 | Teacher overview, student table, student detail (charts) | Stat tiles, two charts, sortable table, per-student page |

If time runs short, stop after checkpoint 6 for the student demo, then do 8 before 7. The teacher dashboard is a named module in the brief. Tests, Lighthouse, and deployment move to after the review.

Demo path for the review: landing → student login → dashboard → chapter map → one lesson → quiz → result + badge → leaderboard → logout → teacher login → overview → one student's detail.

## Future scope

The frontend is built so each of these plugs in without a rewrite.

| Item | What it adds | Where it plugs in |
| --- | --- | --- |
| Backend (Node, Express, MongoDB) | Real accounts, shared class data | `services/api.js` only |
| Real auth (JWT) | Secure login, teacher accounts per school | `AuthContext` |
| Hindi / Marathi | Wider rural reach | i18n context + JSON string files; fonts already support Devanagari |
| Offline mode (PWA) | Works on patchy data | Service worker + cached lessons |
| More subjects and classes | EVS, English; Classes 3–5 | New JSON content, same components |
| Teacher content editor | Teachers add lessons and questions | New teacher route + form |
| Analytics | Weak-topic detection per student | `classService` + new charts |
