# IGNITE

A learning app for small children, for any subject (Maths, English, Hindi, Marathi, Science, Environment, Social studies, General knowledge). Teachers make classes, students and content (chapters with lessons, activities and a quiz) and read reports; students learn through worlds, levels, games, stars and a dress-up buddy. The sample content is NCERT Maths Mela plus English, Environment and General knowledge chapters. README.md has the full detail; this is the short version.

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
  index.js db.js auth.js classes.js content.js progress.js reports.js translate.js  (+ starter-content.json)
client/src/
  main.jsx         every route          api.js       the ONLY file that calls the server
  session.jsx      user + progress      layouts.jsx  headers and nav
  Question.jsx     answer box           QuestionForm.jsx  question editor
  Games.jsx        play boards for every activity   GameArt.jsx  inline SVG pictures   GameForm.jsx  teacher setup forms   Speak.jsx  the Listen button (device voice)
  ThemeToggle.jsx  sun/moon header switch (ThemeToggle) + Auto/Light/Dark choice for Profile (ThemeChoice)
  Buddy.jsx        the dressable animal buddy (Noto Emoji art in assets/buddies + our own clothes)   Rewards.jsx  Stars Confetti Coin Flame Bolt
  i18n/            en.json hi.json mr.json (UI text), t.js (t() + LanguageProvider), LanguagePicker.jsx
  game.js          re-exports ../../shared/game.js
  pages/           one file per page: Landing Login Signup NotFound,
                   student/ Home Learn(worlds) Chapter(level map) Lesson Quiz Result Leaderboard Daily Shop Profile,
                   teacher/ Classes Class Content ChapterEditor QuizEditor Preview Reports Student Profile
```

- One file per page, and one file per server feature. No components folder; small helpers inside the page file are fine.
- Rules go in `shared/game.js` only, never in pages or routes. Pages get data only through `api.js` (`useData` helper).
- Every page has loading, error and empty states. Never show NaN: "nothing yet" is `null`, shown in words.
- Comments in plain English for someone new to React. No em dashes in visible text.
- Languages: student screens use `const t = useT()` and `t('section.key', { vars })` for every word; add a key to all three JSON files. Teacher screens stay English. Server errors carry a `code`; api.js shows `errors.<code>` in the student's language.
- Sessions: a teacher and a student can be logged in at once (two tabs). api.js keeps one saved login per role and picks it by ENDPOINT (`/student/...` always the student's), never by the page on screen. session.jsx exposes `user` (for the part on screen), `teacherUser`, `studentUser`.
- Settings live on the Profile pages (language and Auto/Light/Dark colours). The header only has the sun/moon switch. The login page keeps a language picker (a child must be able to read it before logging in).
- Collections: teachers, classes, students, chapters, lessons, quizzes, attempts (fields in README).

## API routes (all under /api)

- Anyone: `GET /health`, `POST /auth/teacher/signup`, `POST /auth/teacher/login`, `GET /auth/class/:code`, `POST /auth/student/login`, `GET /auth/me`
- Teacher (owner checked): `GET|POST /classes`, `GET|PATCH|DELETE /classes/:classId` (delete needs `{ confirmName }`), `POST /classes/:classId/students`, `PATCH|DELETE /students/:studentId`, `POST /students/:studentId/reset-pin`
- Teacher content (owner checked): `GET|POST /chapters`, `POST /chapters/starter`, `PUT /chapters/order`, `GET /topics`, `GET|PATCH|DELETE /chapters/:chapterId`, `POST /chapters/:chapterId/lessons`, `PUT /chapters/:chapterId/lesson-order`, `PATCH|DELETE /lessons/:lessonId`, `PUT|DELETE /chapters/:chapterId/quiz`
- Student: `GET /student/chapters`, `GET /student/progress`, `GET /student/lessons/:lessonId`, `POST /student/lessons/:lessonId/check`, `POST /student/lessons/:lessonId/finish`, `POST /student/quizzes/:quizId/attempts`, `POST /student/attempts/:attemptId/answers`, `POST /student/attempts/:attemptId/finish` (no body), `GET /student/attempts/:attemptId`, `GET /student/leaderboard`, `PATCH /student/language`, `GET /student/daily`, `POST /student/daily/answers`, `GET /student/shop`, `POST /student/shop/buy`, `PATCH /student/mascot`
- Teacher reports (owner checked): `GET /reports/classes/:classId`, `GET /reports/students/:studentId`

## Game rules (shared/game.js)

- Progress is a history only (`lessonsFinished` + finished attempts); points, streak and badges are always worked out from it.
- Lesson 20 points (first time). Quiz answer: first try 10, after the hint 5. Each learning day 5. Streak = days in a row.
- Quiz score: first 1, hint 0.5, missed 0. Stars at 90 / 75 / 50%. Retakes pay only the answer points above the best earlier try.
- Published chapters open in order: 1 star opens the next; a quiz opens when its lessons are done.
- Badges (7): First Step, Chapter Champion, Star Student, Explorer, On Fire, Never Give Up, Sharp Mind.
- Hindi/Marathi content: optional `hi` / `mr` beside the English (chapter and lesson `.title`, step `.text`, question `prompt options items hint explanation`). `inLanguage` and `localizeQuestion` pick a language and fall back to English field by field; options and items are all-or-none, one for one with the English (`translationProblems`). Answers are checked in the language the quiz started in (`attempt.language`); Devanagari digits count as digits.
- Student language: `student.language` (null until chosen). Login adopts the phone's choice only while it is null; after that the account wins. Changing it on Home saves it to the account.
- Games are question types (`count`, `pattern`; usable in lessons and quizzes) with a `config`; the answer is always derived from it (`gameAnswer`), never typed. Students receive `view` (`gameView`, no answer: pattern gaps are blanks, tiles shuffled), the server checks like any answer (two tries, hint, reveal). Count: `{groups:[{object,colour?,count}], target}`, answer = target's count, given = number text. Pattern: `{sequence:['shape:colour'], gaps, extras}`, given = tile keys per gap. Pictures are inline SVG (never emoji); every game word is in the language files (`games.*`); prompt/hint/explanation use the hi/mr fields. Boards are pointer events plus tap, no libraries. To add a game: rules in shared/game.js (`GAME_TYPES`, `gameProblems`, `gameAnswer`, `gameView`, `gameReady`), a board in Games.jsx, a form in GameForm.jsx, keys in all three language files.
- Subjects: every chapter has a `subject` (SUBJECTS in shared/game.js, names in `subjects.<id>`). Worlds are grouped by subject on the student side, numbered within the subject, and open in order WITHIN a subject (`chapterStates`).
- Activities (question types with a `config`, in `GAME_TYPES`): for any subject: truefalse, unscramble (spelling), pairs (word pairs), sort (into groups); for maths: count, pattern, match (shapes and names), numberline (frog; ask 'land' or 'count'), placevalue (build or read). Add one in shared/game.js (`cleanGameConfig`, `gameProblems`, `gameAnswer`, `gameView`, `gameReady`, and `translatableLists` if it has word lists), Games.jsx, GameForm.jsx, the type picker in QuestionForm.jsx, and the language files. Answers for pairs and sort are index based, so they are the same in every language; `displayAnswer` turns them into words for a reveal.
- Listen: `<Speak text>` reads text aloud with the device's own voice (Web Speech API, hi-IN and mr-IN where the device has them); it is on question prompts and lesson steps, for children who cannot read yet.
- Auto-translate (server/translate.js): saving English text fills empty Hindi/Marathi through MyMemory, cached in the `translations` collection. Only sentences are translated: lists of SINGLE words (options, pairs, sort groups and items) are skipped because MyMemory gets short words wrong (a test turned "Cow" into nonsense); teachers type those in the language tabs, and numbers are copied. A result in Latin letters is rejected. Rules: a teacher's own translation is never overwritten; one made automatically is stamped (`auto`) and refreshed when the English changes; a failure never blocks a save. Editors must send the `auto` stamps back unchanged. `TRANSLATE=off` disables it; `TRANSLATE_EMAIL` raises MyMemory's daily limit.
- Levels: each lesson is a level on its world's map. The server counts the tries on lesson activities (`student.levels`; the app sends no tries), keeps the best outcome, and gives the level 1-3 stars (`levelStars`: all first try 3, mostly hinted 2, else 1; no question = 3). Replaying can raise stars, never lower them. Level answers count in teacher reports.
- Daily challenge: 3 questions a day (`dailyPick`, same all day), from worlds already open. Pays quiz-style points, never counted in reports. One go a day.
- Coins and the buddy: coins = points minus coins spent (`coinBalance`); points never go down and the leaderboard uses points only. Shop items (`SHOP`) are bought with coins, except the milestone gifts (50 star glasses, 100 panda, 200 crown, 400 lion). Buying is double-tap safe: the write only happens if `purchases` is still the size just read and lacks the item, else it re-reads and re-checks the balance.
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

- The student side (`<div className="kid">`, see index.css) is deliberately different from the landing page and teacher screens: colourful, rounded, chunky buttons, Baloo 2 headings, a buddy, stars and confetti. The 16px / 48px / no-sideways-scroll / light-and-dark rules still apply there. The rest of this section is the landing and teacher look.
- Geist + Noto Sans Devanagari from Google Fonts (`@import` in index.css). Colour tokens only (`bg-bg`, `bg-surface`, `text-ink`, `text-muted`, `bg-accent`, `text-good`, `text-warn`...); navy `#0b1f3a` text, orange accent `#c2410c`. Dark mode: `:root[data-theme='dark']` in index.css; the attribute is set before the page draws by a script in index.html (saved choice, default Auto = follow the device) and kept up to date by ThemeToggle.jsx. `.gradient-band` for highlights; text on it is always navy.
- Buttons and nav are pills, cards `rounded-2xl`, inputs `rounded-xl`. No decorative icons, chips or dots.
- Student screens at 375px, in every language: text at least 16px (reading text 16-18px), every link and button at least 48px tall, no sideways scrolling, in light and dark.
