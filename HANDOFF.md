# IGNITE: handoff

State of the code at commit `e2ca65b` ("rescore seed quiz attempts and add a seed check"). `npm run lint`, `npm run build` and `npm run check:seed` all pass. Everything below was checked against the code, not written from memory of the plan. Where the code differs from `CLAUDE.md`, section 8 says so.

---

## 1. What it is, how to run it, how to log in

**IGNITE v1** is a frontend-only React app for CBSE Class 4 Maths, built around the NCERT book *Maths Mela*. It has two roles:

- **Student** (about 9 years old, cheap Android phone, patchy data): works through chapters, answers short activities and quizzes, earns points, streaks, levels and badges, and sees a class leaderboard.
- **Teacher**: sees how the class is doing: stat tiles, charts, a sortable student table, per-student detail and per-chapter quiz results.

There is **no backend**. Content is JSON in `src/data/`; progress is saved in the browser's `localStorage`. Every screen reads data through `src/services/`, which return Promises with a 250 ms artificial delay, so a real API can replace that one folder later.

Content in v1: 14 chapters on the map; chapters 1 to 4 are full (3 lessons and an 8-question quiz each: 12 lessons, 32 quiz questions, plus 12 lesson activity questions); chapters 5 to 14 are visible but locked.

### Run it

Needs a current Node (Vite 8 requires `^20.19.0 || >=22.12.0`; built and tested on Node 24).

```
npm install
npm run dev        # http://localhost:5173 (dev server; also serves /dev/ui, the UI kit page)
npm run build      # production build into dist/
npm run preview    # serves dist/ at http://localhost:4173 (production behaviour, no /dev/ui)
npm run lint       # ESLint, zero warnings allowed
npm run format     # Prettier on src/
npm run check:seed # checks the seed data against the real scoring rules (see section 5)
```

Stack (installed versions): React 18.3.1, react-router-dom 6.30.6, Tailwind CSS 3.4.19, Recharts 2.15.4, lucide-react (icons), Vite 8.3.0. No UI kit, no Redux, no animation library.

### Demo logins

The login card has two role tiles, then a name dropdown and a 4-digit PIN. The card also prints the demo PIN under the chosen name, so you don't need this table at the review.

| Student | Class | PIN | Good for demoing |
| --- | --- | --- | --- |
| Aarav Sharma | 4A | 1042 | Everything done: 620 points, 6 of 7 badges, streak 6 |
| Diya Patel | 4A | 2871 | Mid-way: dashboard says "Continue: Repeating patterns" (chapter 3) |
| Vihaan Reddy | 4A | 3390 | Strong: 480 points |
| Ananya Iyer | 4A | 4156 | Inactive for 6 days (shows on the teacher's "Needs attention") |
| Reyansh Gupta | 4A | 5023 | Average |
| **Ishita Nair** | 4A | 6789 | **Zero progress**: the empty state, then live updates after her first lesson |
| Kabir Khan | 4B | 7314 | Top of 4B: 680 points |
| Saanvi Joshi | 4B | 8265 | Average |
| Arjun Verma | 4B | 9021 | Inactive for 7 days |
| Myra Desai | 4B | 1478 | Average |
| Rohan Mehta | 4B | 2653 | Strong |
| Priya Kulkarni | 4B | 3907 | Below 50% on two chapters (shows on "Needs attention") |

| Teacher | Class (own) | PIN |
| --- | --- | --- |
| Mrs. Sunita Deshmukh | 4A | 4321 |
| Mr. Rajesh Pawar | 4B | 8642 |

"Inactive for N days" is stored as a day offset, so these stay true on any date (section 7).

**Reset:** the login page footer has "Reset demo data". It clears every saved progress key and also resets the in-memory state of whoever is logged in.

**Review demo path:** landing, student login, dashboard, chapter map, one lesson, quiz, result and badge toast, leaderboard, logout, teacher login, overview, one student's detail.

---

## 2. Folder structure

```
ignite/
├─ index.html              page shell; title "IGNITE"; preconnect hints for Google Fonts
├─ package.json            scripts and pinned dependency ranges
├─ vite.config.js          React plugin and the '@' alias to src/
├─ tailwind.config.js      theme: colours come from src/styles/palette.js; fonts; 48px tap sizes; keyframes
├─ postcss.config.js       Tailwind + autoprefixer
├─ .eslintrc.cjs           ESLint 8 rules (react, react-hooks, react-refresh); scripts/ may use Node
├─ .prettierrc             no semicolons, single quotes, 100 columns
├─ jsconfig.json           makes '@/' work in the editor
├─ CLAUDE.md               the project plan this was built from
├─ README.md               short intro and what's mocked (see section 8: it is out of date)
├─ HANDOFF.md              this file
├─ public/favicon.svg      flame mark
├─ scripts/
│  └─ check-seed.js        checks progress.json against src/lib rules; --write repairs points
└─ src/
   ├─ main.jsx             root: BrowserRouter > AuthProvider > ProgressProvider > App
   ├─ App.jsx              route table only; lazy-loads the teacher pages
   ├─ styles/
   │  ├─ index.css         Tailwind layers, Google Fonts import, base body/heading styles
   │  └─ palette.js        the palette hex values in ONE place; Tailwind and the charts both import it
   ├─ data/                read-only seed JSON (see section 3)
   │  ├─ chapters.json     14 chapters: id, number, title, tint, lessonIds, quizId, locked
   │  ├─ lessons.json      12 lessons: explain / example / activity steps; each activity has one question
   │  ├─ quizzes.json      4 quizzes of 8 questions (mcq, input or order); passMark field is not used in code
   │  ├─ students.json     12 students: name, avatar key, PIN, classId (4A/4B)
   │  ├─ teachers.json     2 teachers, each with a class
   │  ├─ badges.json       7 badges: name, kid-friendly description, lucide icon name, rule key
   │  └─ progress.json     seed progress per student; dates stored as "daysAgo" offsets
   ├─ services/            the only layer that touches data (a backend would replace these)
   │  ├─ api.js            request(): resolves after 250 ms, deep-copies data, optional simulated failure
   │  ├─ authService.js    login options, PIN check, session in localStorage
   │  ├─ contentService.js chapters, badges, lesson, quiz, chapter detail
   │  ├─ progressService.js read saved-or-seed progress, saveProgress, resetDemoData
   │  ├─ classService.js   teacher reads: class summary, students, student detail, assessments
   │  └─ leaderboardService.js  classmates' first name, avatar and dated points only
   ├─ context/
   │  ├─ AuthContext.jsx   logged-in user; login/logout; useAuth()
   │  ├─ ProgressContext.jsx  the student's progress as one reducer; loads, saves, resets; useProgress()
   │  └─ progressReducer.js   pure reducer: LESSON_COMPLETED, QUIZ_SUBMITTED, BADGE_UNLOCKED and more
   ├─ lib/                 plain functions, no React, no clock (today is passed in)
   │  ├─ scoring.js        answer checking, stars, points, retake rule, streak, levels
   │  ├─ badgeRules.js     the 7 badge rules and "which badges are newly earned"
   │  ├─ chapterProgress.js  chapter states (done/current/locked), lesson states, quiz unlock
   │  ├─ studentStats.js   next step, 7-day strip, recent badges, level bar, profile stats
   │  ├─ leaderboard.js    weekly points and class ranking
   │  ├─ classStats.js     teacher numbers: averages, lessons per day, needs-attention reasons
   │  ├─ format.js         local-time date helpers (dates are 'YYYY-MM-DD' strings)
   │  └─ tints.js          chapter tint classes, written out in full so Tailwind keeps them
   ├─ hooks/
   │  ├─ useFetch.js       { data, loading, error } with a stale-response guard
   │  ├─ useQuiz.js        reducer for one quiz run: current question, answers, finished
   │  ├─ useBadgeCheck.js  after each lesson/quiz, finds newly earned badges and dispatches them
   │  ├─ useLocalStorage.js  persisted state with try/catch; re-reads if the key changes
   │  ├─ useClassChoice.js   the teacher's 4A/4B/All choice, stored per teacher
   │  ├─ useScrollIntoView.js  scrolls the Next button into view on small screens
   │  └─ useDocumentTitle.js   sets the page title
   ├─ components/
   │  ├─ ui/               Button, Card, ProgressBar, EmptyState, Spinner, Wordmark, Avatar, StatTile,
   │  │                    Toast, BadgeIcon, LockedNotice, QuestionCard (shared by lessons and quiz)
   │  └─ layout/           StudentLayout (+ badge toasts), TeacherLayout, Navbar (points pill), ErrorBoundary
   ├─ features/            one folder per area; each owns its pages
   │  ├─ landing/          LandingPage
   │  ├─ auth/             LoginPage, RequireRole (route guard)
   │  ├─ learn/            ChapterMap, ChapterPage, LessonPlayer
   │  ├─ quiz/             QuizPage, ResultScreen
   │  ├─ student-dashboard/  StudentDashboard
   │  ├─ leaderboard/      LeaderboardPage
   │  ├─ profile/          ProfilePage (badge shelf + stats)
   │  ├─ teacher-dashboard/  Overview, ClassTable, StudentDetail, Assessments,
   │  │                    plus Charts, ClassPicker, ReasonChip used only here
   │  ├─ not-found/        NotFoundPage
   │  └─ dev/              UiKitPage: every shared component; only reachable at /dev/ui in dev
   └─ assets/              badges/ and illustrations/ are empty placeholders (icons come from
                           lucide-react; the one illustration is an inline SVG in StudentDashboard)
```

---

## 3. Data flow

```
 src/data/*.json  (read-only content + seed progress)
        |
        v
 services/*   <- every call goes through api.request(): 250 ms delay, deep copy
        |                \
        |                 +--> localStorage  (saved progress, session, teacher's class choice)
        v
 STUDENT SIDE                               TEACHER SIDE
 ProgressContext (useReducer)               classService.rowsFor(classId)
   - loads progress + chapters + badges       - for each student: saved progress if any,
   - applies rules via lib/                     otherwise the seed (progressService.peekProgress)
   - saves after a real action                - lib/classStats.js computes the numbers
        |                                       (today passed in)
        v                                            |
 pages via useProgress()                             v
 (content pages also useFetch -> contentService)  Overview / ClassTable / StudentDetail / Assessments
```

**Content vs progress.** Chapters, lessons, quizzes and badges come from `contentService` through `useFetch` in each page. The logged-in student's own progress comes from `ProgressContext`, so every screen shows the same live numbers.

**Seed progress is relative to today.** `progress.json` stores each date as a `daysAgo` offset. `progressService.hydrateSeed()` turns them into real `'YYYY-MM-DD'` dates at read time. So "active yesterday" is always yesterday, and "this week" and "inactive 3+ days" are right on any demo day.

**Saving.** The reducer sets `dirty: true` only on `LESSON_COMPLETED`, `QUIZ_SUBMITTED` and `BADGE_UNLOCKED`. A `useEffect` in `ProgressContext` then calls `saveProgress`. Loading (`HYDRATED`) and `RESET` clear `dirty`, so logging in or refreshing never writes to storage. This matters because writing the seed on first read would freeze its dates to that day.

**One place reads the clock.** `ProgressContext.send()` stamps every action with `now: todayISO()`. The reducer refuses an action without `now`. Everything in `lib/` takes `today` as an argument.

**Badges.** After a lesson or quiz, `useBadgeCheck` runs `lib/badgeRules.newlyEarnedBadges()` and dispatches `BADGE_UNLOCKED`. The check only runs when `lastEvent` is set (a real action), so seed students never get toasts for old achievements. Several badges at once queue as toasts, shown one at a time for 5 seconds in an always-present `aria-live="polite"` region.

**Teacher side.** There is no server, so the teacher's pages read the same `localStorage` the student wrote to: `peekProgress(id)` returns saved progress if it exists, otherwise the hydrated seed. If Ishita finishes a lesson, the teacher sees it after a refresh, **on the same browser**. `lib/classStats.js` then does all the maths (it returns `null` instead of `NaN` when there is nothing to average, and each screen turns that into an empty state).

**Leaderboard.** `leaderboardService` returns only first name, avatar and the dated points for the logged-in student's own class. The page replaces the student's own row with the live context progress, so it moves immediately after a lesson.

**localStorage keys**

| Key | Holds |
| --- | --- |
| `ignite:session` | the logged-in user (role, id, name, class) |
| `ignite:progress:<studentId>` | that student's saved progress, written only after a real action |
| `ignite:teacher:<teacherId>:class` | that teacher's 4A / 4B / all choice |

---

## 4. Modules and pages

Every page follows one skeleton: loading, then error (with "Try again"), then empty, then content. Locked things opened by URL show `LockedNotice` with a back button.

### Public

| Route | File | Shows | Hooks and lib it uses |
| --- | --- | --- | --- |
| `/` | `features/landing/LandingPage.jsx` | Wordmark hero, one-line pitch, three feature tiles; "Start learning" and "I'm a teacher". Already logged in: the matching button goes to that role's home, otherwise to `/login` with the role tile pre-selected | `useAuth`, `useDocumentTitle`, `tints.getTint` |
| `/login` | `features/auth/LoginPage.jsx` | Role tiles, then name dropdown and 4-digit PIN (digits only, auto-focus on a wrong PIN), reason banner when redirected, "Reset demo data" in the footer | `useAuth`, `useProgress` (`resetDemo`), `useFetch` (names), `useState`, `useRef`, `useId`, `useNavigate`, `useLocation`; `authService.getLoginOptions` |
| route guard | `features/auth/RequireRole.jsx` | Wrong or no role: redirect to `/login` with "Please log in first" or "That area is for teachers/students"; remembers where you were going | `useAuth`, `useLocation` |

### Student area (`StudentLayout`: top bar with points pill, level and streak; bottom tabs on phones, left rail from 768 px; one error boundary per page)

| Route | File | Shows | Hooks and lib it uses |
| --- | --- | --- | --- |
| `/student` | `student-dashboard/StudentDashboard.jsx` | Greeting, points, level, streak, level progress bar; the big **Continue where you left off** card; 7-day activity strip; last 3 badges. A brand-new student (Ishita) gets an illustration and "Start your first lesson" | `useProgress`, `useAuth`, `useFetch` (lesson title), `useMemo`; `studentStats` (`nextStep`, `activityStrip`, `recentBadges`, `levelProgress`, `isBrandNew`), `scoring.currentStreak` |
| `/student/learn` | `learn/ChapterMap.jsx` | Winding path of all 14 chapters: done (filled, stars), current (pulsing), locked (grey, lock icon, reason always visible as text) | `useProgress`, `useFetch`; `chapterProgress.getChapterMapEntries` |
| `/student/learn/:chapterId` | `learn/ChapterPage.jsx` | Chapter header, lesson progress, 3 lesson rows (done / up next / not started), chapter quiz card locked until every lesson is done. Locked chapter by URL: friendly "Finish X first" | `useProgress`, `useFetch`; `chapterProgress` (`getChapterEntry`, `getLessonStates`, `isQuizUnlocked`, `getBestQuizStars`); `contentService.getChapterDetail` |
| `/student/learn/:chapterId/:lessonId` | `learn/LessonPlayer.jsx` | Step cards (Learn, Example, Try it), progress bar on top, one big Next. The Try-it step uses `QuestionCard`; Next stays hidden until it is answered. Finish: "+20 points" and a streak line if it was the day's first activity | `useProgress` (`completeLesson`), `useFetch`, `useScrollIntoView`, `useState`; `chapterProgress` |
| `/student/quiz/:quizId` | `quiz/QuizPage.jsx` | One question per screen, progress bar, two-tries feedback, "See my score". Guards: chapter locked, or not every lesson done. Leaving mid-quiz asks for confirmation | `useQuiz`, `useProgress` (`submitQuiz`), `useFetch`, `useScrollIntoView`; `chapterProgress` |
| `/student/quiz/:quizId/result` | `quiz/ResultScreen.jsx` | Stars, score %, points earned with a line-by-line breakdown, "next chapter is open" message, "Review mistakes" with the answer explained. Reads the latest saved attempt, so it survives a refresh; no attempt yet: redirects to the quiz | `useProgress`, `useFetch`; `scoring.quizAttemptPoints` (rebuilds the breakdown from the saved answers), `chapterProgress` |
| `/student/leaderboard` | `leaderboard/LeaderboardPage.jsx` | Own class only, first names. Podium for the top 3, list below, your row highlighted and a pinned "You are #N of M" bar always on screen. Toggle: This week (default) / All time | `useProgress`, `useFetch`, `useMemo`; `leaderboard.rankClass`; `leaderboardService` |
| `/student/profile` | `profile/ProfilePage.jsx` | Avatar, level bar, stats (lessons, quizzes, average quiz score, best streak), badge shelf: earned in colour, locked as dashed outlines with their description | `useProgress`, `useAuth`; `studentStats` (`profileStats`, `levelProgress`) |

Shared by lessons and quiz: `components/ui/QuestionCard.jsx` handles the three question types (tap to choose, number input, tap-to-arrange) and the two-tries feedback, and uses `scoring.checkAnswer`.

### Teacher area (`TeacherLayout`: fixed ink-900 sidebar on desktop, three tabs on phones; lazy-loaded)

All four pages use `useClassChoice` (the 4A / 4B / All picker; starts on the teacher's own class and is remembered per teacher), `useFetch`, `useDocumentTitle`, and `classStats` through `classService`.

| Route | File | Shows |
| --- | --- | --- |
| `/teacher` | `teacher-dashboard/Overview.jsx` | Four stat tiles (students, average quiz score, lessons this week, inactive 3+ days); bar chart of class average per chapter; area/line chart of lessons completed per day for 14 days; **Needs attention** list with the reasons. Charts have hover tooltips and a "Show as table" view |
| `/teacher/students` | `teacher-dashboard/ClassTable.jsx` | Search by name, sort by points / best score / last active, class filter. A real table from 768 px; one card per student on phones. Rows link to detail. Uses `useMemo` for filtering and sorting |
| `/teacher/students/:studentId` | `teacher-dashboard/StudentDetail.jsx` | Name, level, points, streak, badges; best score per chapter chart; lessons done per chapter; recent quiz attempts; the student's attention reasons |
| `/teacher/assessments` | `teacher-dashboard/Assessments.jsx` | Per chapter: class average, number of attempts, how many students are at 3 / 2 / 1 / 0 stars, and how many haven't tried |

Not found: `features/not-found/NotFoundPage.jsx` (inside the student or teacher shell for unknown paths under them, full page otherwise).

---

## 5. Key rules, with the real numbers

All rules are plain functions in `src/lib/`, so each can be explained and tested on its own.

### Points (`lib/scoring.js`, `POINTS`)

| Action | Points |
| --- | --- |
| Finish a lesson, **first time only** (replaying gives 0) | 20 |
| Quiz answer right first try | 10 |
| Quiz answer right after the hint | 5 |
| Quiz answer missed (answer shown) | 0 |
| First time a quiz reaches 3 stars | +30 |
| Retake that beats your best score | +15 (plus the rule below) |
| Daily streak, on the first activity of each day | 5 x streak day, day capped at 7 (so 5, 10 ... 35) |

Points reward effort and accuracy, never speed: there is no timer.

### Two tries per question (`QuestionCard`) and the quiz score

First miss: amber "Not quite. Try again." plus the hint. Second miss: the answer and explanation are shown and the child moves on. Each question ends as `first`, `hint` or `missed`.

- Score % = (first-try answers x 1 + hinted answers x 0.5) / questions x 100. Hinted answers count half so a child who needed the hint everywhere can't still collect 3 stars.
- **Stars** use the exact percentage (not the rounded one): **1 star at 50% or more, 2 at 75%, 3 at 90%**, otherwise 0.
- Number answers ignore spaces and commas ("3,456" equals "3456") and letter case.

### Retake rule (`scoring.attemptPoints`, one function)

- **First attempt:** the answer points, plus 30 if it earns 3 stars.
- **Retake that does not beat your best score:** **0 points.** (Otherwise one child could climb the leaderboard by replaying an easy quiz.)
- **Retake that beats your best score:** (this attempt's answer points minus your best earlier answer points, never below 0) **+ 15**, plus 30 only if this is the first time the quiz reaches 3 stars.
- Example: 75% (60 answer points) then 88% (70): 10 + 15 = 25. Then 100% (80) for the first 3 stars: (80 - 70) + 15 + 30 = 55.

### Streak (`scoring.applyStreak`, `currentStreak`)

- An "activity" is finishing a lesson or submitting a quiz. Logging in does not count.
- On the first activity of a **local** day: last active yesterday means streak + 1; any longer gap, or never, means the streak restarts at 1. Streak points (above) are awarded once that day. A streak of 0 always counts the next activity as day 1.
- The header shows the streak while the last activity was today or yesterday, and 0 after a missed day. `bestStreak` is also tracked for the profile.

### Levels (`scoring.levelFor`)

Every 250 points is a level: Spark 0 to 249, Flame 250 to 499, Blaze 500 to 749, Bonfire 750 to 999, **Star 1000 and up** (top level).

### Badges (`lib/badgeRules.js`, keys match `badges.json`)

| Badge | Rule (as coded) |
| --- | --- |
| First Step | at least one lesson completed |
| Shape Explorer | chapter 1 "finished" |
| Pattern Pro | best result on the chapter 3 quiz is 3 stars |
| Thousand Club | chapter 4 "finished" |
| On Fire | streak of 5 or more days |
| Never Give Up | any quiz attempt scoring higher than every earlier attempt at the same quiz |
| Sharp Mind | 10 first-try **quiz** answers in a row; the run carries across quizzes; a hinted or missed answer resets it; lesson activities don't count |

"Finished a chapter" means what the map calls done: every lesson completed and the quiz passed with at least 1 star. A badge is never awarded twice: `newlyEarnedBadges` skips badges already held, and the reducer filters again.

### Unlock rule (`lib/chapterProgress.js`)

- Chapter 1 is always open. A content chapter opens when the **previous chapter's quiz has at least 1 star** (best attempt). Only one chapter is ever "current" (the first not yet done).
- Chapters 5 to 14 have no content and are always locked ("Coming soon").
- A chapter's quiz opens when **all its lessons are done**. Lessons inside an open chapter can be opened in any order.
- The same rules guard the URLs for chapter, lesson, quiz and result.

### "This week" (`lib/leaderboard.js` and `lib/classStats.js`)

A **rolling 7-day window: today and the 6 days before it** (not Monday to Sunday, so nobody drops to zero every Monday). Weekly points count only points that carry a date:

- 20 for each lesson whose `completedAt` falls in the window,
- plus the stored points of each quiz attempt whose `date` falls in the window,
- plus each `streakLog` entry (date and points) in the window.

"All time" is the stored total. Seed totals also include older undated points, so all-time is never less than the dated sum; `check:seed` enforces that. The teacher's "Lessons this week" tile uses the same 7-day window on `completedAt`.

### Teacher numbers (`lib/classStats.js`)

- **Score** means each student's **best attempt per quiz**. A retake replaces an earlier score instead of dragging the class average down. The class average, per-chapter bars and "below 50%" all use it.
- **Inactive** = last active 3 or more days ago, or never active.
- **Needs attention** = best score under 50% on any chapter quiz, **or** inactive. Each student is listed once, with every reason ("45% on Shapes Around Us", "Inactive 3 days").
- Line chart: lessons completed per `completedAt` date, last 14 days, zero-filled.

---

## 6. Every React hook used, and why

### Built-in

| Hook | Where | Why |
| --- | --- | --- |
| `useState` | most pages; `useFetch`, `useLocalStorage`, `AuthContext`, `QuestionCard` | Local UI state: form fields, selected answer, toggles, retry counters |
| `useReducer` | `ProgressContext` (`progressReducer`), `useQuiz` | Several related values change together by rules. The progress reducer is pure, so the same actions always give the same state |
| `useEffect` | `ProgressContext` (load student data; save after real actions), `useBadgeCheck`, `useFetch`, `useDocumentTitle`, `useScrollIntoView`, `Navbar` (detect a points gain to animate), `StudentLayout` (5 s toast timer) | Only for syncing with something outside React: storage, timers, the page title, scroll |
| `useContext` | inside `useAuth()` and `useProgress()` only | Components never call it raw; both wrappers throw if used outside their provider |
| `useMemo` | `AuthContext` and `ProgressContext` values; `useQuiz` (outcomes, score); `ClassTable` (filter and sort); `LeaderboardPage` (ranking); `StudentDashboard` (next step) | Derived data from lists, and stable context values so consumers don't re-render needlessly |
| `useCallback` | `AuthContext` (`login`, `logout`); `ProgressContext` (`send` and the action functions); `useLocalStorage` | Keeps functions stable. `send` is in the dependency list of effects, so an unstable one would re-run them. (There are no `React.memo` children; this is the real reason.) |
| `useRef` | `Navbar` (previous points, to tell a gain from a first load); `QuestionCard` (select the input after a miss); `LoginPage` (focus the PIN box after a wrong PIN); `useScrollIntoView` | Values or DOM nodes that must not trigger a re-render |
| `useId` | `QuestionCard`, `LoginPage`, `ClassTable`, `Charts` | Pairs labels with inputs and charts with headings for screen readers |

Not hooks, but used: `React.lazy` and `Suspense` (teacher pages in `App.jsx`, plus a second `Suspense` inside `TeacherLayout` so the sidebar stays put while a page loads); `startTransition` (in `AuthContext.logout`, so clearing the user and navigating to `/login` land in one render); a class `ErrorBoundary` around each layout's page area, keyed by path so moving to another page clears an error (React has no hook for catching render errors). React Router hooks: `useNavigate`, `useLocation`, `useParams`.

### Custom (`src/hooks/`)

| Hook | Used by | Job |
| --- | --- | --- |
| `useFetch(serviceFn, deps)` | nearly every page | `{ data, loading, error }`; an `ignore` flag drops a stale response if the inputs change or the page unmounts |
| `useQuiz(quiz)` | `QuizPage` | Reducer for one run: current question, recorded answers, finished; exposes score and stars from `lib/scoring` |
| `useBadgeCheck(state, send)` | `ProgressContext` | After a lesson/quiz, runs the badge rules and dispatches new unlocks (skipped on load) |
| `useLocalStorage(key, initial)` | `useClassChoice` | State that persists, wrapped in try/catch; re-reads if the key changes (a different teacher) |
| `useClassChoice()` | the 3 teacher list pages | Teacher's class choice, stored under a key that includes the teacher id |
| `useScrollIntoView(active)` | `LessonPlayer`, `QuizPage` | On a 360 px phone the Next button appears below the fold once a question is settled; scrolls it into view, respecting reduced motion |
| `useDocumentTitle(title)` | every page | Sets the browser tab title |

`CLAUDE.md` also lists `useMediaQuery`; it was **not built**. The bottom-tabs-versus-rail switch is done with Tailwind breakpoints (`md:hidden`, `hidden md:flex`), which needs no JavaScript.

---

## 7. Design decisions and the reason for each

| Decision | Reason |
| --- | --- |
| **Warm palette** (ember orange brand, deep indigo text, cream background) | Friendly and readable in sunlight on a cheap screen; deliberately not the default blue-purple SaaS look |
| **One palette file** (`styles/palette.js`) imported by Tailwind and by the charts | Charts need real hex values in JavaScript; this keeps hex codes out of components. A build check showed the generated classes are unchanged |
| **Text colours must pass AA contrast.** `ember-700` for white-on-button text; `amber-700` for wrong-answer text; chapter labels use ink for the sky, leaf and berry tints (`tints.js`) | sky-500 on white is 2.8:1 and leaf-600 is 3.3:1, below the 4.5:1 small text needs. Colour still shows in stripes and fills, but words never rely on it |
| **Fonts: Baloo 2 (headings), Nunito (body)** | Both readable at small sizes; Baloo 2 is designed in India and supports Devanagari, so Hindi/Marathi later needs no font change |
| **No UI kit, no Redux, no animation library** | A UI kit makes an app look template-made; Context + `useReducer` is enough for two contexts; small motion is Tailwind keyframes, all `motion-safe:` so reduced-motion users get none |
| **Tap-to-arrange, not drag-and-drop** | Easier for a 9-year-old on a phone, accessible with a keyboard, and needs no library. Items are tracked by position, so repeated items ("Red, Yellow, Red") work |
| **Amber, not red, for wrong answers**, plus the words "Not quite" and "Not this one" | Red feels like punishment to a 9-year-old; words mean colour is never the only signal. Red (`berry-600`) is kept for real errors only |
| **Two tries and a hint** | First miss teaches, second miss shows the answer so a child is never stuck; hinted answers still earn half |
| **Relative seed dates** (`daysAgo` offsets turned into dates at read time) | The demo is right on any day. Hard-coded dates would make everyone "inactive" a week later |
| **Pure reducer; every action carries `now`** | The same actions always give the same state, so a week of activity can be replayed in a test by passing different dates. Only `ProgressContext.send` reads the clock |
| **Save only after real actions** (`dirty` flag) | Saving on load would freeze the seed's relative dates to the first day it was opened |
| **Best-attempt scoring for the class numbers** | A child who retries shouldn't drag the class average down, and a teacher cares about what the child can do now |
| **Retake pays only for improvement** | Stops points farming on an easy quiz, so the leaderboard rewards learning |
| **Rolling 7-day "this week", leaderboard defaults to it** | A new or slower student can still reach the top, and nobody resets to zero on a Monday |
| **Dates are local-time strings (`'YYYY-MM-DD'`)** | `toISOString()` is UTC; in India it would report yesterday between midnight and 5:30 am |
| **PIN, not password** | Kids forget passwords; a 4-digit PIN is easier. The login is a labelled demo only |
| **Lazy-loaded teacher area** | Recharts is about 102 kB gzipped. A student session downloaded 2 JS files and never the charts chunk (measured on the production build). Kids on patchy data shouldn't pay for a teacher tool |
| **Teacher class choice stored per teacher** | A second teacher on the same laptop starts on their own class |
| **Locked reasons shown as text, not hover tooltips** | Phones have no hover. Every locked node and chapter says why, always |
| **Toasts in a persistent `aria-live="polite"` region** | Screen readers announce a new badge without focus moving; queued badges wait their turn |
| **Seed data scored by the real rules, and checked** (`npm run check:seed`) | Seed numbers were once hand-picked and disagreed with the rules. The script now loads `src/lib` and verifies all 12 students |
| **Helpers stay inside a page until a second feature needs them** | Matches the plan's convention. Exceptions, shared on purpose: `QuestionCard` (lesson + quiz), `StatTile` and `Avatar` (teacher + student) |

---

## 8. Known limits, differences from the plan, and future scope

### Known limits

- **No backend.** Everything is local. Data shows the same on any machine only because the seed is identical.
- **Same-browser data.** Progress lives in that browser's `localStorage`. The teacher sees a student's new work only on the same device and browser. Clearing site data wipes it ("Reset demo data" restores the seed).
- **Demo auth only.** PINs are in the JSON that ships to the browser, checked client-side, and the login card prints the PIN under the name. Fine for a demo, not for real use.
- **Total time is not tracked.** Nothing records time spent, so the profile does not show "total time"; the profile stats are lessons, quizzes, average quiz score and best streak (and `CLAUDE.md` was updated to match). Points deliberately ignore speed.
- **Content is 4 of 14 chapters.** 5 to 14 are locked with no content.
- **Seed attempts have no per-question record,** so "Review mistakes" is empty for them (live attempts have it). Seed students' older streak points are undated, so the weekly board leaves them out and their all-time totals include them.
- **Avatars are initials.** `students.json` has animal avatar names but no artwork yet (`TODO(fattesing)` in `Avatar.jsx`).
- **Error states exist but are never triggered.** Every page has one, and `api.js` can simulate failures with `errorRate`, but nothing turns that on. Set it in `api.js` to demo them.
- **`passMark` in `quizzes.json` is unused.** The star rule decides pass and unlock.
- **Leaving a quiz mid-way discards its answers** (after a confirmation).
- **The clock is the device's clock.** A child could change it to affect streaks; a server date would fix that.
- **English only.** All copy is written inline in the components, so Hindi/Marathi would need the strings moved into i18n files first.
- **No automated tests are committed.** The only committed check is `npm run check:seed`. During the build, behaviour was verified with Playwright scripts (reducer rules with injected dates, full lesson/quiz/teacher click-throughs at 360 px and 1280 px, empty states, and the production bundle). Those scripts were kept outside the repo. Vitest and React Testing Library are planned (`CLAUDE.md`, module 10).
- **Not done yet:** deployment config (a Vercel/Netlify SPA rewrite so deep links work) and the Lighthouse mobile run.
- **`README.md` is out of date.** It still says "Checkpoint 1 of 8", says Node 18 (Vite 8 needs 20.19+ or 22.12+), and lists the old test page.

### Differences from `CLAUDE.md`

- `QuestionCard` lives in `components/ui/`, not `features/quiz/`, because lessons and the quiz both use it.
- The chapter map file is `ChapterMap.jsx` (the plan called it `SubjectMap`).
- Drag-to-order became **tap-to-arrange** (a decision made during the build).
- `ProgressContext` exposes `completeLesson` and `submitQuiz` instead of the service having `saveLessonComplete` / `saveQuizAttempt`; `progressService` is `getProgress`, `saveProgress`, `resetDemoData`. The plan file was updated.
- Added beyond the plan: `amber-500` and `amber-700` tokens, `styles/palette.js`, `scripts/check-seed.js`, `leaderboardService`, `lib/studentStats.js`, `lib/leaderboard.js`, `lib/classStats.js`, `Avatar`, `StatTile`, `Toast`, `LockedNotice`.
- Not built: `useMediaQuery` (breakpoints instead), `Modal`, a quiz timer (`useRef` for a timer was in the plan; speed isn't rewarded), badge SVG art (icons come from lucide-react).

### Future scope (all plug into one place)

| Item | Where it plugs in |
| --- | --- |
| Backend (Node, Express, MongoDB): shared class data | `services/api.js` and the other files in `services/`; components don't change. `saveProgress` becomes a PUT; `classService` and `leaderboardService` move server-side |
| Real auth (JWT), teacher accounts per school | `authService.js` and `AuthContext` |
| Hindi / Marathi | i18n context and string files; fonts already cover Devanagari |
| Offline mode (PWA) | Service worker and cached lessons |
| More subjects and classes | New JSON content, same components; the badge rules that name chapters 1, 3 and 4 would need generalising |
| Teacher content editor | New teacher route and form |
| Analytics / weak-topic detection | `classService` and new charts |

---

## 9. Likely reviewer questions

**Why is there no backend?**
It's a v1 prototype for the review. All data goes through `services/` with a simulated delay, so loading and empty states are real and a backend later only changes that folder.

**Is the login secure?**
No, and it says so (labelled demo auth in the README). PINs are in the shipped JSON and checked in the browser. Real auth is the first backend task and only touches `authService` and `AuthContext`.

**How does the teacher see student data without a server?**
Both roles read the same `localStorage` in one browser. `classService` takes each student's saved progress, or the seed if they haven't done anything. So the teacher sees a student's work after a refresh, on the same device only.

**Why Context and `useReducer` instead of Redux?**
There are only two pieces of global state, auth and progress. A reducer gives the rules a single place; Redux would be extra weight for a phone.

**Can a child farm points?**
Lesson points are first completion only. A quiz retake earns points only if it beats the best score, and then only the improvement plus 15 (plus 30 once, for the first 3 stars). A retake that doesn't improve earns 0.

**How is the weekly leaderboard worked out?**
Rolling 7 days: 20 per lesson finished in the window, plus the stored points of quiz attempts dated in the window, plus the dated streak points. All time is the stored total.

**Why does a quiz count hinted answers as half?**
So a child who needed the hint on every question can't still get 3 stars. Stars come from the exact percentage: 50, 75, 90.

**Why amber and not red for mistakes?**
Red feels like punishment to a 9-year-old. Amber with "Not quite, try again" and a hint keeps it encouraging. The message also says it in words, so it doesn't depend on colour.

**Why tap-to-arrange instead of drag-and-drop?**
It's easier for small hands on a phone, works with a keyboard and screen reader, and needs no library.

**What happens when the date changes between demos?**
Seed dates are stored as "days ago" and turned into real dates when read, so "active yesterday" and "inactive 6 days" stay correct on any day.

**What does "pure reducer with `now`" mean?**
The reducer never reads the clock. Every action carries today's date from the one place that does (`ProgressContext.send`). The same actions always give the same state, which is why the streak and weekly rules could be tested by replaying different dates.

**How do you know the scoring is right?**
All rules are plain functions in `lib/`. `npm run check:seed` re-derives every seed attempt's points from them. During the build the reducer and rules were exercised with injected dates and hand-calculated totals. There are no committed unit tests yet; Vitest is the planned next step.

**Why lazy-load the teacher area?**
Recharts is the largest dependency (about 102 kB gzipped). Students on cheap phones and patchy data never need it; on the production build a student session downloads two JS files and the charts chunk is only fetched when a teacher opens their pages.

**How does it cope with a low-end phone and patchy data?**
Designed at 360 px first, 48 px tap targets, no heavy libraries on the student side (main bundle about 286 kB, 89 kB gzipped), animations are CSS-only and switch off for reduced motion. It is not a PWA yet, so it does need a connection for the first load (offline mode is future scope).

**How would you add chapter 5?**
Add its entries to `chapters.json` (`locked: false`), `lessons.json` and `quizzes.json`, then run `npm run check:seed`. The map, chapter page, lessons, quiz, scoring and teacher charts pick it up from the data. The badge rules that name specific chapters would need extending.

**How would you add a backend?**
Replace the bodies of the service functions with API calls (`api.js` is the one place that fakes the network). Components call the same functions and don't change. `saveProgress`, `getClassSummary`, `getLeaderboard` and the login would move server-side.

**Is it accessible?**
Labelled form fields, visible focus rings, text not colour for every state (locked reasons, "Not this one", needs-attention chips), `aria-live` for toasts and feedback, 48 px targets, reduced-motion support, a table view under every chart, and a podium that reads 1st, 2nd, 3rd to a screen reader. It has not had a full audit or a Lighthouse run yet.

**Why is some seed data "wrong" compared to a real class?**
It is invented, but now consistent: seed quiz points are computed by the real scoring rules and `check:seed` verifies all 12 students (stars match scores, points match rules, totals cover the dated points, no missing badges).
