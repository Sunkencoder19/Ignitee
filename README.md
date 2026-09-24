# IGNITE

A maths learning app for CBSE Class 4 kids, built around the new NCERT book *Maths Mela*.
Students work through chapters, earn points and badges, and take short quizzes. Teachers
see how the class is doing.

This is v1: frontend only. There's no backend yet. Content comes from JSON files in
`src/data/` and progress is saved to localStorage, all behind `src/services/`, so a real
API can slot in later without touching the screens.

## Running it

Needs Node 18 or newer.

```
npm install
npm run dev
```

Then open http://localhost:5173.

Other scripts: `npm run build`, `npm run lint`, `npm run format`.

## Stack

Vite, React 18, React Router 6, Tailwind CSS 3, Recharts 2 and lucide-react for icons.
No UI kit. The palette lives in `tailwind.config.js`.

## What's mocked

Login is fake: pick a role, pick a name, type a 4-digit PIN. It's there so the student and
teacher screens can be demoed, not for security.

Progress is saved in the browser's localStorage. The teacher screens read the same storage,
so a teacher sees a student's new work only on the same device and browser. A real backend
fixes that; until then, demo both roles in one browser. "Reset demo data" on the login page
puts everyone back to the starting data.

## Status

Checkpoint 1 of 8: project setup and the shared UI pieces. The app currently opens on a
test page showing every button, card and progress bar in the palette.
