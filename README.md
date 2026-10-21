# IGNITE

A learning app for small children, for any subject: maths, languages, science, environment and general knowledge. The sample content is the NCERT book *Maths Mela* for Class 4, plus English, Environment and General knowledge chapters.

- **Teachers** sign up, create classes, add students (each gets a 4-digit PIN), write chapters with lessons, activities and quizzes in any subject (or start from ready-made sample chapters), publish them to their classes, and see reports on who is struggling with what.
- **Students** log in with their class code, name and PIN, work through short lessons, take a quiz at the end of each chapter (two tries per question, a hint after the first miss), and earn points, stars and badges. Each class has its own leaderboard.

It runs on your computer in development mode: a React app (`client/`), a Node server (`server/`) and a local MongoDB database. There is no build or deploy step yet.

## Setup

You need **Node 20.19 or newer** and **MongoDB Community Server** (local, not Atlas). On a Mac:

```
brew tap mongodb/brew
brew install mongodb-community
brew services start mongodb-community
```

MongoDB then answers on `mongodb://127.0.0.1:27017`. To look at the data, open MongoDB Compass and connect to that address; the app's database is `ignite_app`.

### 1. Server settings

```
cd server
cp .env.example .env
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

Paste the long string that last command prints into `.env` as `JWT_SECRET`. The file should look like:

```
MONGODB_URI=mongodb://127.0.0.1:27017/ignite_app
JWT_SECRET=<the long random string>
PORT=4000
```

`.env` is in `.gitignore` and must never be committed; `.env.example` is the committed template. (Port 4000, because macOS uses 5000 for AirPlay.)

### 2. Run both dev servers

Two terminals:

```
cd server && npm install && npm run dev     # API on http://localhost:4000 (restarts on changes)
cd client && npm install && npm run dev     # app on http://localhost:5173
```

Open http://localhost:5173. The React dev server forwards every `/api/...` request to port 4000, so the browser only ever talks to 5173.

If MongoDB isn't running, the server says so (`Start it with: brew services start mongodb-community`), keeps retrying every 5 seconds, and answers API calls with a clear 503 error instead of hanging. http://localhost:5173/api/health shows whether the database is connected.

### 3. First run

1. **Log in**, then **I'm a teacher**, then **Create an account**.
2. **Create your first class.** Note its 6-character class code.
3. **Add students.** Each one's PIN is shown once; write it down (you can reset it later).
4. **Content**, then **Add the 4 starter chapters** (or create your own). Open a chapter, tick your class, and **Publish**.
5. In a private window, log in as a student with the class code, their name and PIN.

## Folder layout

```
IGNITE/
├── shared/
│   └── game.js          EVERY rule: points, stars, streak, badges, unlocking, checking answers,
│                        checking what teachers write, accuracy and "struggling". No imports.
│                        Used by both the server and the app, so no rule is written twice.
├── server/              Node + Express + MongoDB (Mongoose). One file per feature, each with
│   │                    its own models and routes:
│   ├── index.js         app setup, /api/health, mounts the routes, error replies
│   ├── db.js            connects to MongoDB (and retries, with a clear message)
│   ├── auth.js          Teacher model; sign-up and login; student login; the requireTeacher and
│   │                    requireStudent checks; the wrong-PIN lockout
│   ├── classes.js       Class and Student models; classes, students, PINs
│   ├── content.js       Chapter, Lesson and Quiz models; the content builder
│   ├── progress.js      Attempt model; everything a student does (lessons, quizzes, leaderboard)
│   ├── reports.js       class and student reports (no models of its own)
│   ├── translate.js     automatic Hindi and Marathi for what teachers write (MyMemory, cached)
│   ├── starter-content.json   the 4 ready-made Maths Mela chapters
│   └── .env.example     settings template (copy to .env)
└── client/              React app (Vite, Tailwind)
    ├── vite.config.js   forwards /api to the server; allows importing ../shared
    └── src/
        ├── main.jsx       every URL in the app, plus a crash screen instead of a blank page
        ├── index.css      colours (light and dark), font, shared button/card/input styles
        ├── api.js         the ONLY file that talks to the server; one function per endpoint
        ├── game.js        passes on shared/game.js, so pages can import '../game'
        ├── session.jsx    who is logged in, and a student's progress
        ├── layouts.jsx    student and teacher headers and navigation
        ├── Question.jsx   the answer box (two tries) used by lessons, quizzes and previews
        ├── QuestionForm.jsx  the editor for one question, used by both content editors
        ├── Games.jsx      the play boards of the games (count, pattern): React, CSS/SVG, pointer events
        ├── GameArt.jsx    the games' pictures, drawn as inline SVG (mangoes, birds, tiles, blocks, shapes)
        ├── GameForm.jsx   the teacher's setup forms for each game
        ├── ThemeToggle.jsx   the sun/moon switch in every header, and the Auto/Light/Dark choice for Profile pages
        ├── Buddy.jsx      the buddy: ready-made animal art (assets/buddies, Noto Emoji, Apache 2.0) plus hats, glasses, scarves, capes and scenes drawn here
        ├── Rewards.jsx    stars, confetti, coin, streak and points icons
        ├── i18n/          English, Hindi and Marathi: en.json hi.json mr.json (every word on the
        │                  student screens), t.js (the t() helper), LanguagePicker.jsx
        └── pages/         one file per page
            ├── Landing, Login, Signup, NotFound
            ├── student/   Home, Learn (worlds), Chapter (level map), Lesson, Quiz, Result, Leaderboard, Daily, Shop, Profile
            └── teacher/   Classes, Class, Content, ChapterEditor, QuizEditor, Preview, Reports, Student, Profile
```

## Collections in MongoDB

| Collection | What's in it |
|---|---|
| `teachers` | name, email, passwordHash, createdAt |
| `classes` | name, code (6 characters, unique), teacher |
| `students` | name (unique within the class), class, teacher, pinHash, language (en, hi, mr, or null until chosen), lessonsFinished: [{ lesson, date, stars }], levels (lesson activity answers: tries, best outcome), dailies (the daily challenge by day), purchases (shop items), mascot (what the buddy wears) |
| `translations` | key (language and English text), text: the automatic translation cache |
| `chapters` | title, subject, teacher, classes (which classes see it), status (draft or published), order |
| `lessons` | title, chapter, teacher, order, steps: [{ type, text, question? }] |
| `quizzes` | chapter (one each), teacher, questions: [{ type, prompt, options, config, answer, hint, explanation, topic }] |
| `attempts` | student, class, chapter, quiz, language (the quiz is checked in it), status (in-progress or finished), answers: [{ question, prompt, topic, given, tries, outcome }], score, stars, answerPoints, date |

Chapters, lessons, steps and questions may also carry optional `hi` and `mr` translations next to the English (for example a question's `hi: { prompt, options, items, hint, explanation }`). Anything left out is shown in English.

A student's progress is only a history: `lessonsFinished` plus their finished attempts. Points, streak and badges are always worked out from it and never stored.

## API

Every route is under `/api`. **Who** means: *anyone*; a logged-in *teacher*; a logged-in *student*; or the *owner* (the teacher whose class, student or chapter it is; anyone else gets "not found").

| Method | Path | Who | What it does |
|---|---|---|---|
| GET | /health | anyone | Is the server up, and is the database connected? |
| **Login** | | | |
| POST | /auth/teacher/signup | anyone | Create a teacher account `{ name, email, password }` (8 to 72 characters) |
| POST | /auth/teacher/login | anyone | Teacher login `{ email, password }` |
| GET | /auth/class/:code | anyone | The class name and its students' names, for the student login list |
| POST | /auth/student/login | anyone | Student login `{ classCode, studentId, pin, language }`; `language` (the phone's choice) is saved only if the student has none yet |
| GET | /auth/me | logged in | Who the saved login belongs to |
| **Classes and students** | | | |
| GET | /classes | teacher | Their classes, with student counts |
| POST | /classes | teacher | Create a class `{ name }`; the server picks the code |
| GET | /classes/:classId | owner | The class and its students (never their PINs) |
| PATCH | /classes/:classId | owner | Rename `{ name }` |
| DELETE | /classes/:classId | owner | Delete it with its students and their history. Needs `{ confirmName }` = the class name |
| POST | /classes/:classId/students | owner | Add a student `{ name }`; the reply has the PIN, once |
| PATCH | /students/:studentId | owner | Rename `{ name }` |
| DELETE | /students/:studentId | owner | Remove a student and their history |
| POST | /students/:studentId/reset-pin | owner | New PIN, shown once; also lifts a wrong-PIN lock |
| **Content** | | | |
| GET | /chapters | teacher | Their chapters in order, with lesson and question counts |
| POST | /chapters | teacher | New draft chapter `{ title }` |
| POST | /chapters/starter | teacher | Add the sample chapters the teacher does not have yet, as drafts (matched by title, never twice) |
| PUT | /chapters/order | teacher | Save a new order `{ chapterIds }` (all of theirs, each once) |
| GET | /topics | teacher | Every topic they have used, for suggestions |
| GET | /chapters/:chapterId | owner | The whole chapter, with lessons and quiz, including answers |
| PATCH | /chapters/:chapterId | owner | `{ title?, classIds?, status? }`; publishing checks the chapter is complete |
| DELETE | /chapters/:chapterId | owner | Delete with its lessons and quiz (refused once students have started it) |
| POST | /chapters/:chapterId/lessons | owner | Add a lesson `{ title, steps }` |
| PUT | /chapters/:chapterId/lesson-order | owner | Save lesson order `{ lessonIds }` |
| PATCH | /lessons/:lessonId | owner | Replace a lesson's title and steps |
| DELETE | /lessons/:lessonId | owner | Delete a lesson (refused once students have finished it) |
| PUT | /chapters/:chapterId/quiz | owner | Save the whole quiz `{ questions }` |
| DELETE | /chapters/:chapterId/quiz | owner | Delete the quiz (refused once students have taken it) |
| **Student** | | | |
| GET | /student/chapters | student | Published chapters for their class: open, done or locked, with lessons and quiz |
| GET | /student/progress | student | Points, streak, best streak, badges and history |
| GET | /student/lessons/:lessonId | student | A lesson's steps; activity questions **without** answers |
| POST | /student/lessons/:lessonId/check | student | Check an activity answer `{ questionId, given, tries }` (practice: not recorded) |
| POST | /student/lessons/:lessonId/finish | student | Record the lesson as finished; replies with points earned and new badges |
| POST | /student/quizzes/:quizId/attempts | student | Start a quiz; the questions come **without** answers, hints or explanations |
| POST | /student/attempts/:attemptId/answers | student | Answer one question `{ questionId, given }`; the server checks it and records the outcome |
| POST | /student/attempts/:attemptId/finish | student | Finish; **no body**. The server scores it from its own records |
| GET | /student/attempts/:attemptId | student | A finished attempt, with the right answers and explanations |
| GET | /student/leaderboard | student | First names and points for their own class |
| GET | /student/daily | student | Today's challenge: three questions **without** answers (or that it is done, or not available yet) |
| POST | /student/daily/answers | student | Answer one challenge question `{ questionId, given }`, in order; two tries, judged by the server |
| GET | /student/shop | student | Points, coins, the buddy's outfit and every shop item with whether it is owned |
| POST | /student/shop/buy | student | Buy an item `{ item: 'hat:cap' }` with coins. Safe against double taps: it can never spend the same coins twice |
| PATCH | /student/mascot | student | Dress the buddy `{ buddy, hat, face, neck, background }` (only things the student owns) |
| PATCH | /student/language | student | Save the student's language `{ language: 'en' \| 'hi' \| 'mr' }`; their content then comes in it |
| **Reports** | | | |
| GET | /reports/classes/:classId | owner | Summary, needs attention, accuracy by chapter and topic, struggling students, each student's weakest topics, lessons per day |
| GET | /reports/students/:studentId | owner | One student: needs attention, accuracy by topic and chapter, weakest topics, badges, recent quizzes |

Errors come back as `{ "error": "A sentence you can show" }` (validation errors also list every problem in `problems`).

## Game rules

All in `shared/game.js`.

- **Lesson:** 20 points the first time it's finished.
- **Quiz answers:** two tries each. Right first time: 10 points. Right after the hint: 5 points. Missed twice: 0, and the right answer and explanation are shown.
- **Quiz score:** right first time counts 1, after the hint ½, missed 0. 90% or more is 3 stars, 75% is 2, 50% is 1.
- **Retakes:** only pay the answer points above the student's best earlier attempt on that quiz, so retaking an easy quiz earns nothing.
- **Learning days:** 5 points for each day with any learning. The streak is the number of days in a row.
- **Unlocking:** published chapters open in order within their subject. 1 star or more on a chapter's quiz opens the next one; a quiz opens once all its lessons are done.
- **Badges (7):** First Step (finish a lesson), Chapter Champion (finish a chapter: every lesson, then pass the quiz), Star Student (3 stars on any quiz), Explorer (finish 3 chapters), On Fire (5 days in a row), Never Give Up (beat your best score on a retake), Sharp Mind (10 quiz answers right first time in a row).
- **Leaderboard:** each class only, first names and points only.
- **Games:** besides multiple choice, typing and ordering, a question can be a game. *Count objects*: several kinds of object (mango, bird, tile, block) sit on a board and students count one kind (tap each to keep track, then set the number). *Pattern puzzle*: a row of shape-and-colour tiles with one or two hidden; students drag the right tiles in (or tap them), with optional wrong tiles mixed in. Games work in lessons and quizzes, have the same two tries, hint and explanation, and score the same. The teacher sets the board, never the answer: it is worked out from the board. Students are sent the board only. All their words come from the language files, and the question, hint and explanation have Hindi and Marathi fields like any other.
- **Any subject:** every chapter has a subject (Maths, English, Hindi, Marathi, Science, Environment, Social studies, General knowledge). Students see their worlds grouped by subject, numbered within it, and each subject opens in order on its own. Activities that work for any subject: *True or false*, *Unscramble the word* (spelling), *Match pairs of words* and *Sort into groups*, besides multiple choice, typing and ordering. A **Listen** button reads questions and lessons aloud with the device's own voice, for children who cannot read yet. The landing page is written for small children and is not about one subject or class. The sample chapters now include English, Environment and General knowledge; teachers can add the ready-made ones at any time and ones they have are not added twice.
- **More games:** *Match* (pair pictures with their names in the student's language), *Number line jump* (a frog hops along a line: where does it land, or how many jumps reach the flag) and *Place value blocks* (build a number from ones, tens, hundreds and thousands, or read the blocks shown).
- **Worlds and levels:** a chapter is a world, shown as a map. Each lesson is a level; its activity answers are recorded (the server counts the tries) and the level earns 1 to 3 stars: all first try 3, mostly with a hint 2, otherwise 1 (a level with no question is 3). Replaying can raise the stars, never lower them. The chapter quiz is the trophy at the end of the map. Level answers count in teacher reports.
- **Daily challenge:** three questions a day from worlds the student has already opened (new each day, the same all day). Bonus points like quiz answers, but just for fun: never counted in teacher reports.
- **Coins, the buddy and the shop:** a student earns 1 coin for every point and spends coins in the shop on friends, hats, glasses, neckwear and scenes for their buddy. Points never go down and the leaderboard uses points only. Four gifts are free at point milestones: star glasses at 50, the panda at 100, the golden crown at 200 and the lion at 400. Buying is safe against double taps. The animal pictures are Noto Emoji by Google (Apache License 2.0; the license is kept in `client/src/assets/buddies/`); the clothes are drawn in the app.
- **Auto-translate:** when a teacher saves English text, any empty Hindi or Marathi is filled in automatically (MyMemory, a free service; only question and lesson text is sent). A translation a teacher writes or edits is never overwritten; an automatic one is refreshed when the English changes. Only sentences are translated: lists of single words (options, pairs, sort groups and items) are left for the teacher, because machine translation often gets short words wrong. If the service is down or over its daily limit, saving still works and students see English. Settings in `server/.env`: `TRANSLATE=off`, and `TRANSLATE_EMAIL` to raise MyMemory's daily limit. Machine translation should be checked by someone who reads Hindi and Marathi.
- **Settings:** language and colours (Auto, Light, Dark) are on the Profile pages; the header has only a sun/moon switch. A teacher and a student can be logged in at the same time in two tabs.
- **Languages:** student screens come in English, Hindi or Marathi. The choice made on the login page belongs to the phone; once a student logs in, their own saved language wins, so it follows them on a shared phone. Answers are checked in the language the quiz started in, and Devanagari digits (१२) count the same as 12. Teacher screens and reports stay in English. The starter chapters' Hindi and Marathi were machine-written by Claude and should be checked by a native speaker.

## Report rules

- **Accuracy:** right first time 1, after the hint 0.5, missed 0 (the same as the quiz score), divided by the number of answers. Grouped by chapter and by the topic each quiz question is tagged with.
- **Latest try only:** accuracy and "struggling" use each student's latest finished attempt on each quiz, so a student who improves drops off the list.
- **Struggling:** below 60% on a chapter or topic, once there are at least 3 answers to judge from.
- **Weakest topics:** a student's topics with 3 or more answers, lowest accuracy first.
- **Needs attention:** a best quiz score below 50%, or no learning for 3 days or more (or not started).
- **Nothing yet:** with no answers, a number is `null` and the page says so in words. Reports never show NaN.

## Security rules

- **The server checks every answer.** Students receive questions without answers, hints, explanations or topics. Each quiz answer is sent on its own; the server checks it, counts the try and records first, hint or missed itself.
- **Answers are revealed only when earned:** the hint after the first miss, the right answer and explanation after the second miss, and all of them once the quiz is finished.
- **Scores come only from the server's records.** Finishing a quiz takes no input; a request that sends a score, stars or answers is refused. Questions must be answered in order, once each.
- **Ownership on every route.** Each teacher route loads the record together with the teacher's id, so a teacher can only see or change their own classes, students, content and reports; anything else is "not found". Students only see published chapters for their own class, and only once they are unlocked.
- **Passwords and PINs** are stored only as bcrypt hashes. A student's PIN is shown to the teacher once, when it's made or reset.
- **Wrong PINs:** 5 wrong PINs lock that student out for 15 minutes. The lock clears itself after 15 minutes, or straight away when the teacher resets the PIN.
- **Logins** are JSON Web Tokens that last 7 days, signed with `JWT_SECRET`. Removing a student or teacher logs them out at once.
- **Deleting is careful:** deleting a class needs its name typed in; a chapter, lesson or quiz that students have started can't be deleted (unpublish it instead).
- **Secrets stay local:** `server/.env` is gitignored, and the dev server only serves files from `client/` and `shared/`.

## Deploy

Frontend on Vercel, backend on Render, database on MongoDB Atlas. No secrets go in the repo; set them in each service's dashboard.

### 1. MongoDB Atlas

1. Make a free cluster. Under **Database Access** add a user with a password.
2. Under **Network Access** allow Render. Its addresses change, so use `0.0.0.0/0`.
3. **Connect > Drivers** gives the connection string, like `mongodb+srv://USER:PASSWORD@cluster0.xxxxx.mongodb.net/ignite_app?retryWrites=true&w=majority`. Keep `/ignite_app` before the `?`.

### 2. Render (web service)

| Setting | Value |
|---|---|
| Root Directory | leave empty (repo root, so `shared/` is included) |
| Runtime | Node |
| Build Command | `cd server && npm install` |
| Start Command | `cd server && node index.js` |
| Health Check Path | `/api/health` |

Environment variables:

| Name | Value |
|---|---|
| `NODE_ENV` | `production` |
| `MONGODB_URI` | the Atlas connection string |
| `JWT_SECRET` | a long random string: `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"` |
| `CLIENT_ORIGIN` | the exact Vercel address, e.g. `https://your-app.vercel.app` (no trailing slash; several allowed, separated by commas) |
| `TRANSLATE` | optional, `off` turns auto-translate off |
| `TRANSLATE_EMAIL` | optional, raises MyMemory's daily limit |

Do not set `PORT`; Render sets it and the server reads it. The free plan sleeps when idle, so the first request after a pause is slow.

### 3. Vercel (project)

| Setting | Value |
|---|---|
| Framework Preset | Vite |
| Root Directory | `client` |
| **Include source files outside of the Root Directory in the Build Step** | **ON** (Settings > General > Root Directory). The build imports `../shared/game.js`, which is outside `client/`. |
| Build Command | `npm run build` |
| Output Directory | `dist` |
| Install Command | `npm install` |

Environment variable (Production and Preview): `VITE_API_URL` = the Render address, e.g. `https://your-server.onrender.com` (no trailing slash). It is read when the app is built, so redeploy after changing it.

`client/vercel.json` sends every path to `index.html`, so deep links and refreshes work.

### 4. Order and check

1. Atlas, then Render (with a first guess for `CLIENT_ORIGIN`), then Vercel with `VITE_API_URL`.
2. Copy the real Vercel address into Render's `CLIENT_ORIGIN` and let Render redeploy.
3. Open `https://your-server.onrender.com/api/health`; it should say the database is connected. Then open the Vercel address and sign up as a teacher.

Local dev is unchanged: leave `VITE_API_URL` and `CLIENT_ORIGIN` unset.

## Tech

Light and dark: every header has a **Colours** switch (Auto, Light, Dark). Auto follows the device, and the choice is remembered in the browser.

Client: React 18, React Router 7, Tailwind CSS 4, Vite. Server: Express 5, Mongoose 9, bcryptjs, jsonwebtoken, cors, dotenv. Database: MongoDB Community Server. Locally everything runs in dev mode; the only build is the client's, for Vercel (see Deploy). There are no lint or test steps.
