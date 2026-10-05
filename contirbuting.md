## Setup
1. Node 20.19+ required.
2. `npm install`, then `npm run dev` (http://localhost:5173).

## Workflow
- Create a branch from `main`: `feature/<short-name>` or `fix/<short-name>`.
- Keep commits small, with plain messages ("add read-aloud button").
- Before opening a PR, run `npm run lint`, `npm run build` and `npm run check:seed`.
- Open a pull request; at least one teammate reviews before merging.

## Code rules
- Follow the folder structure 
- Game rules live in `src/lib/` as plain functions, with today's date passed in.
- Data access only through `src/services/`.
- Use palette tokens from `tailwind.config.js`, never raw hex codes.
