# IGNITE

Maths practice app for CBSE Class 4 (NCERT *Maths Mela*). Teachers make classes, students and content, and read reports; students learn and take quizzes. README.md has the full detail; this is the short version.

## Run (dev mode only)

```
brew services start mongodb-community      # local MongoDB on 127.0.0.1:27017 (Compass: same address)
cd server && cp .env.example .env          # then put a long random JWT_SECRET in .env
cd server && npm run dev                   # API, http://localhost:4000 (node --watch)
cd client && npm run dev                   # app, http://localhost:5173 (proxies /api to 4000)
```

`server/.env`: `MONGODB_URI=mongodb://127.0.0.1:27017/ignite_app`, `JWT_SECRET`, `PORT=4000`. It is gitignored; never commit it. No build, lint, format or test tooling. The user does git themselves: never commit.

Allowed packages. Client: react, react-dom, react-router-dom, tailwindcss, @tailwindcss/vite, vite, @vitejs/plugin-react. Server: express, mongoose, bcryptjs, jsonwebtoken, cors, dotenv. Ask before adding anything.

## Layout and code rules

```
shared/game.js     every rule, plain functions, no imports; used by server and client
server/            one file per feature, holding its own Mongoose models and routes:
  index.js db.js auth.js classes.js content.js progress.js reports.js  (+ starter-content.json)
client/src/
  main.jsx         every route          api.js       the ONLY file that calls the server
  session.jsx      user + progress      layouts.jsx  headers and nav
  Question.jsx     answer box           QuestionForm.jsx  question editor
  game.js          re-exports ../../shared/game.js
  pages/           one file per page: Landing Login Signup NotFound,
                   student/ Home Learn Chapter Lesson Quiz Result Leaderboard,
                   teacher/ Classes Class Content ChapterEditor QuizEditor Preview Reports Student
```

- One file per page, and one file per server feature. No components folder; small helpers inside the page file are fine.
- Rules go in `shared/game.js` only, never in pages or routes. Pages get data only through `api.js` (`useData` helper).
- Every page has loading, error and empty states. Never show NaN: "nothing yet" is `null`, shown in words.
- Comments in plain English for someone new to React. No em dashes in visible text.
- Collections: teachers, classes, students, chapters, lessons, quizzes, attempts (fields in README).

## API routes (all under /api)

- Anyone: `GET /health`, `POST /auth/teacher/signup`, `POST /auth/teacher/login`, `GET /auth/class/:code`, `POST /auth/student/login`, `GET /auth/me`
- Teacher (owner checked): `GET|POST /classes`, `GET|PATCH|DELETE /classes/:classId` (delete needs `{ confirmName }`), `POST /classes/:classId/students`, `PATCH|DELETE /students/:studentId`, `POST /students/:studentId/reset-pin`
- Teacher content (owner checked): `GET|POST /chapters`, `POST /chapters/starter`, `PUT /chapters/order`, `GET /topics`, `GET|PATCH|DELETE /chapters/:chapterId`, `POST /chapters/:chapterId/lessons`, `PUT /chapters/:chapterId/lesson-order`, `PATCH|DELETE /lessons/:lessonId`, `PUT|DELETE /chapters/:chapterId/quiz`
- Student: `GET /student/chapters`, `GET /student/progress`, `GET /student/lessons/:lessonId`, `POST /student/lessons/:lessonId/check`, `POST /student/lessons/:lessonId/finish`, `POST /student/quizzes/:quizId/attempts`, `POST /student/attempts/:attemptId/answers`, `POST /student/attempts/:attemptId/finish` (no body), `GET /student/attempts/:attemptId`, `GET /student/leaderboard`
- Teacher reports (owner checked): `GET /reports/classes/:classId`, `GET /reports/students/:studentId`

## Game rules (shared/game.js)

- Progress is a history only (`lessonsFinished` + finished attempts); points, streak and badges are always worked out from it.
- Lesson 20 points (first time). Quiz answer: first try 10, after the hint 5. Each learning day 5. Streak = days in a row.
- Quiz score: first 1, hint 0.5, missed 0. Stars at 90 / 75 / 50%. Retakes pay only the answer points above the best earlier try.
- Published chapters open in order: 1 star opens the next; a quiz opens when its lessons are done.
- Badges (7): First Step, Chapter Champion, Star Student, Explorer, On Fire, Never Give Up, Sharp Mind.
- Teachers' questions are checked by `questionProblems` (mcq answer must be an option, 2-6 options; order needs 2+ items; hint and explanation required; quiz questions need a topic), on the client and again on the server.

## Report rules

- Accuracy uses the same credit (first 1, hint 0.5, missed 0), from each student's LATEST finished attempt per quiz.
- Struggling: below 60% on a chapter or topic with at least 3 answers. Weakest topics: 3+ answers, lowest first.
- Needs attention: best quiz score below 50%, or no learning for 3+ days.

## Security rules (keep these true)

- Never send students answers, hints, explanations or topics before they answer. The server checks every answer, counts tries and records the outcome itself; quiz scores come only from those records. `finish` refuses any body.
- Hint only after a first miss; answer and explanation after a second miss or once the quiz is finished.
- Every teacher route loads the record with `teacher: req.teacher._id` (otherwise 404). Every student route checks published, own class, and unlocked.
- Passwords and PINs are bcrypt hashes; a PIN is shown once. 5 wrong PINs lock for 15 minutes; a PIN reset or 15 minutes clears it (`clearLockout` in auth.js).
- Guards are added per route (`requireTeacher` / `requireStudent`), never with `router.use`, because every router is mounted at `/api`.

## Design

- Geist from Google Fonts (`@import` in index.css). Colour tokens only (`bg-bg`, `bg-surface`, `text-ink`, `text-muted`, `bg-accent`, `text-good`, `text-warn`...); navy `#0b1f3a` text, orange accent `#c2410c`, automatic dark mode. `.gradient-band` for highlights; text on it is always navy.
- Buttons and nav are pills, cards `rounded-2xl`, inputs `rounded-xl`. No decorative icons, chips or dots.
- Student screens at 375px: text at least 16px (reading text 16-18px), every link and button at least 48px tall, no sideways scrolling, in light and dark.
