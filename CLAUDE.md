# IGNITE

Maths practice app for CBSE Class 4 (NCERT *Maths Mela*). Two roles: student and teacher.
Frontend only for now. `server/` is empty and is where the backend will go.

## Run

```
cd client && npm install && npm run dev    # http://localhost:5173
```

Dev mode only. There is no build, lint, format or test step; don't add one until the backend exists.
Stack: React 18, React Router 7, Tailwind CSS 4, Vite. Add no other libraries without asking.

## Layout

```
client/src/
  main.jsx       every route, plus a crash screen so an error never leaves a blank page
  index.css      colour tokens (light + dark), font, shared .btn / .card / .field classes
  api.js         the ONLY file that reads or writes data; each function names its future endpoint
  game.js        every rule as a plain function (no React, no storage)
  session.jsx    logged-in user and the student's progress (useSession)
  layouts.jsx    student and teacher headers/nav; also send wrong roles to /login
  Question.jsx   the answer box shared by Lesson and Quiz (two tries, hint after the first miss)
  data/*.json    demo data; moves to the server later
  pages/         Landing, Login, NotFound
    student/     Home, Learn, Chapter, Lesson, Quiz, Result, Leaderboard
    teacher/     Overview, Students, Student
```

Code rules:
- One file per page. Everything a page draws lives in that file; small helper functions inside it are fine. Don't create a components folder.
- Pages get data only through `api.js` (use its `useData` helper). Rules go in `game.js`, never in pages.
- Write comments in plain English for someone new to React.

## Data and game rules

Saved progress is only a history: `{ studentId, lessons: [{ lessonId, date }], attempts: [{ quizId, score, stars, answerPoints, answers, date }] }`.
Points, streak, badges and "last active" are always worked out from it, never stored. Dates are local `YYYY-MM-DD` strings.

- Lesson: 20 points the first time it's finished.
- Quiz answer: 10 points right first time, 5 points right after the hint.
- Quiz score: a hinted answer counts half. Stars: 90% = 3, 75% = 2, 50% = 1.
- Retake: pays only the answer points above the best earlier attempt on that quiz.
- Each day with any learning: 5 points. Streak = days in a row with learning.
- Chapters open in order: 1 star on a chapter's quiz opens the next. A quiz opens when all its lessons are done.
- Teacher "needs attention": best quiz score below 50%, or no learning for 3+ days.
- Badges (7): First Step (first lesson), Shape Explorer (finish Chapter 1), Pattern Pro (3 stars on the Chapter 3 quiz),
  Thousand Club (finish Chapter 4), On Fire (5 days in a row), Never Give Up (beat your best score on a retake),
  Sharp Mind (10 quiz answers right first time in a row). Demo attempts have no answers, so they never count towards Sharp Mind.

## Design

- Font: Geist, loaded from Google Fonts by the `@import` at the top of `index.css` (not an npm package).
- Colours: use the tokens only (`bg-bg`, `bg-surface`, `text-ink`, `text-muted`, `border-line`, `bg-accent`, `text-good`, `text-warn`...), never hex codes in pages.
  Light: navy text `#0b1f3a` on `#f6f9fc`, one orange accent `#c2410c`. Dark mode is automatic via the same tokens.
  The warm `.gradient-band` is for highlights only; text on it is always navy.
- Shapes: buttons and nav are pills (`rounded-full`), cards `rounded-2xl`, inputs `rounded-xl`.
- No decorative icons, pills, chips or dots. Say things in words. No em dashes in visible text.
- Motion: only the landing hero fade-in, the gradient drift and hover lift, all off under reduced motion.

Student screens (checked at 375px wide):
- Text at least 16px; reading text 16-18px. Larger is only for headings and display numbers.
- Every link and button at least 48px tall.
- No sideways scrolling on phones, in light or dark mode.
