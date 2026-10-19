# IGNITE

A maths practice app for CBSE Class 4, built around the NCERT book *Maths Mela*.

- **Teachers** sign up, create classes, add students (each gets a 4-digit PIN), write chapters with lessons and quizzes (or start from 4 ready-made chapters), publish them to their classes, and see reports on who is struggling with what.
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
        └── pages/         one file per page
            ├── Landing, Login, Signup, NotFound
            ├── student/   Home, Learn, Chapter, Lesson, Quiz, Result, Leaderboard
            └── teacher/   Classes, Class, Content, ChapterEditor, QuizEditor, Preview, Reports, Student
```

## Collections in MongoDB

| Collection | What's in it |
|---|---|
| `teachers` | name, email, passwordHash, createdAt |
| `classes` | name, code (6 characters, unique), teacher |
| `students` | name (unique within the class), class, teacher, pinHash, lessonsFinished: [{ lesson, date }] |
| `chapters` | title, teacher, classes (which classes see it), status (draft or published), order |
| `lessons` | title, chapter, teacher, order, steps: [{ type, text, question? }] |
| `quizzes` | chapter (one each), teacher, questions: [{ type, prompt, options, answer, hint, explanation, topic }] |
| `attempts` | student, class, chapter, quiz, status (in-progress or finished), answers: [{ question, prompt, topic, given, tries, outcome }], score, stars, answerPoints, date |

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
| POST | /auth/student/login | anyone | Student login `{ classCode, studentId, pin }` |
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
| POST | /chapters/starter | teacher | Add the 4 starter chapters as drafts (only when they have none) |
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
- **Unlocking:** published chapters open in order. 1 star or more on a chapter's quiz opens the next one; a quiz opens once all its lessons are done.
- **Badges (7):** First Step (finish a lesson), Chapter Champion (finish a chapter: every lesson, then pass the quiz), Star Student (3 stars on any quiz), Explorer (finish 3 chapters), On Fire (5 days in a row), Never Give Up (beat your best score on a retake), Sharp Mind (10 quiz answers right first time in a row).
- **Leaderboard:** each class only, first names and points only.

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

## Tech

Client: React 18, React Router 7, Tailwind CSS 4, Vite. Server: Express 5, Mongoose 9, bcryptjs, jsonwebtoken, cors, dotenv. Database: MongoDB Community Server. Everything runs in dev mode; there are no build, lint or test steps yet.
