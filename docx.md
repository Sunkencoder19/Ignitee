## Before you start
1. npm run build && npm run preview, then open the printed URL.
2. On the login page, click **Reset demo data**.

## Student flow (about 4 minutes)
1. **Landing page:** explain the problem: rural students lack engaging, curriculum-aligned tools.
2. Log in as **Ishita Nair** (PIN 6789): a brand-new student, so the dashboard shows the empty state.
3. Open **Learn**: the winding chapter map. Chapter 1 is current, 2–4 are locked with reasons, 5–14 are coming soon.
4. Finish **Lesson 1**: miss once to show the amber hint, then answer correctly. The points pill jumps (+25: 20 lesson + 5 streak) and the **First Step** badge toast appears.
5. Finish the remaining lessons, then take the **chapter quiz**: show the two-tries feedback and the result screen with stars and "Review mistakes".
6. Open **Leaderboard**: weekly ranking with the pinned "You are #N" bar.
7. Open **Profile**: badge shelf and stats.

## Teacher flow (about 2 minutes)
1. Log out, log in as **Mrs. Sunita Deshmukh** (PIN 4321).
2. **Overview**: stat tiles, chapter averages chart, 14-day activity chart, "Needs attention" list.
3. **Students** → open **Ishita**: her new progress appears, showing student activity reaching the teacher.
4. **Assessments**: per-chapter averages and star distribution.

## Key points to mention
Frontend only; the services/ layer is ready for a backend.
Retakes only pay for improvement, so points can't be farmed.
Seed dates are relative, so the demo works on any day.
Teacher charts load only for tea
chers, keeping the student app light.

## After the demo
Click **Reset demo data** again.