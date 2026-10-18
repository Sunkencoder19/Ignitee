# IGNITE

A maths practice app for CBSE Class 4, built around the NCERT book *Maths Mela*.

- **Students** read short lessons, answer questions (two tries, with a hint after the first miss), take a quiz at the end of each chapter, earn points, stars and badges, and see a class leaderboard.
- **Teachers** see how their class is doing: quiz results per chapter, lessons per day, and which students need help.

Right now only the frontend exists. Data comes from JSON files, and progress is saved in the browser. The backend will go in `server/`.

## Run it

You need Node 20.19 or newer.

```
cd client
npm install
npm run dev
```

Open http://localhost:5173.

## Demo logins

The login page shows each person's PIN once you pick their name.

| Name | Role | PIN | Good for showing |
| --- | --- | --- | --- |
| Ishita Nair | Student, 4A | 6789 | A brand-new student with no progress |
| Diya Patel | Student, 4A | 2871 | Halfway through (chapter 3) |
| Aarav Sharma | Student, 4A | 1042 | Every chapter finished |
| Mrs. Sunita Deshmukh | Teacher, 4A | 4321 | Teacher view |
| Mr. Rajesh Pawar | Teacher, 4B | 8642 | Teacher view |

"Reset demo data" on the login page clears everything saved in the browser.

## Folder layout

```
IGNITE/
├── client/                  the React app
│   ├── index.html
│   ├── package.json
│   ├── vite.config.js
│   └── src/
│       ├── main.jsx         every URL in the app, in one list
│       ├── index.css        colours (light and dark) and the shared button/card/input styles
│       ├── api.js           the ONLY file that reads or writes data
│       ├── game.js          every rule: points, stars, streak, unlocking, teacher numbers
│       ├── session.jsx      who is logged in, and the student's progress
│       ├── layouts.jsx      the header and navigation around student and teacher pages
│       ├── Question.jsx     the answer box used by lessons and quizzes
│       ├── data/            demo data (chapters, lessons, quizzes, users, progress)
│       └── pages/           one file per page
│           ├── Landing.jsx  Login.jsx  NotFound.jsx
│           ├── student/     Home, Learn, Chapter, Lesson, Quiz, Result, Leaderboard
│           └── teacher/     Overview, Students, Student
└── server/                  the backend goes here (empty for now)
```

Every page is a single file that contains everything it draws. To change a page, open its file.

## Pages

| URL | File | What it shows |
| --- | --- | --- |
| `/` | `pages/Landing.jsx` | What IGNITE is, and a sample question to try |
| `/login` | `pages/Login.jsx` | Pick student or teacher, your name, and your PIN |
| `/student` | `pages/student/Home.jsx` | What to do next, your numbers, and this week |
| `/student/learn` | `pages/student/Learn.jsx` | All 14 chapters and which are open |
| `/student/learn/:chapterId` | `pages/student/Chapter.jsx` | A chapter's lessons and its quiz |
| `/student/learn/:chapterId/:lessonId` | `pages/student/Lesson.jsx` | A lesson, one step at a time |
| `/student/quiz/:quizId` | `pages/student/Quiz.jsx` | The chapter quiz |
| `/student/quiz/:quizId/result` | `pages/student/Result.jsx` | Score, stars, points, and mistakes to review |
| `/student/leaderboard` | `pages/student/Leaderboard.jsx` | Points ranking for your class |
| `/teacher` | `pages/teacher/Overview.jsx` | Class numbers, quiz results, lessons per day, who needs help |
| `/teacher/students` | `pages/teacher/Students.jsx` | Every student, with search and sort |
| `/teacher/students/:studentId` | `pages/teacher/Student.jsx` | One student in detail |

## Game rules

All of these live in `client/src/game.js`.

- **Lesson:** 20 points the first time you finish it.
- **Quiz answer:** 10 points if right first time, 5 if right after the hint.
- **Quiz score:** a hinted answer counts as half. 90% or more is 3 stars, 75% is 2, and 50% is 1.
- **Retake:** you only get the points above your best earlier attempt, so retaking an easy quiz earns nothing.
- **Learning day:** 5 points for each day you learn something.
- **Streak:** the number of days in a row you have learned something.
- **Badges:** seven, listed on the student Home page with how to earn each one:
  First Step (finish a lesson), Shape Explorer (finish Chapter 1), Pattern Pro (3 stars on the Chapter 3 quiz),
  Thousand Club (finish Chapter 4), On Fire (learn 5 days in a row), Never Give Up (beat your best score on a retake),
  Sharp Mind (10 quiz answers right first time in a row).
- **Unlocking:** chapters open in order. Get 1 star or more on a chapter's quiz to open the next chapter. A quiz opens once all its lessons are done.
- **Needs attention (teacher):** a best score below 50% on a quiz, or no learning for 3 days or more.

A student's saved progress is only a history (lessons finished and quiz attempts, each with a date). Points, streak, badges and "last active" are always worked out from that history. (Demo quiz attempts have no saved answers, so Sharp Mind can only be earned by playing quizzes in the app.)

## Connecting the backend

Only `client/src/api.js` needs to change. Each function in it has a comment naming the endpoint it should call, for example:

```js
// GET /api/chapters
export function getChapters() {
  return respond(chapters)          // today: local JSON
  // later: return fetch('/api/chapters').then((r) => r.json())
}
```

Steps:

1. Build the endpoints listed in `api.js` in `server/`. Move `client/src/data/*.json` into the server as the starting data.
2. In `client/vite.config.js`, uncomment the `proxy` line so `/api/...` requests reach the server during development.
3. Replace each function body in `api.js` with a `fetch()` call. No page needs to change.
4. Move the PIN check into the server, and stop sending PINs to the browser (the demo login shows them on purpose).

## Tech

React 18, React Router 7, Tailwind CSS 4, and Vite. There are no other libraries. The app only runs in dev mode (`npm run dev`) for now.
