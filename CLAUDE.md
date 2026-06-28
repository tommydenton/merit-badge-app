# CLAUDE.md

# See global: /Users/thomasdenton/.claude/CLAUDE.md

## Project-specific overrides

Full-stack Merit Badge Counselor application for the Longhorn Council. Node.js + Express REST API, MySQL, Bootstrap 5 + jQuery + Select2 frontend, Multer uploads, Express Validator. This project is JavaScript/Node and MySQL, not the homelab Python/K3s stack. See `README.md`, `PROJECT_SUMMARY.md`, and `CONFIGURATION_CHECKLIST.md` for full detail.

### Naming conventions

- Route files: camelCase (`applications.js`, `database.js`)
- Model files: PascalCase class in file (`Application.js`)
- Frontend files: lowercase with purpose (`app.js`, `style.css`)
- Database files: snake_case (`seed_merit_badges.sql`)
- Functions: camelCase, verb-prefixed for actions (`loadMeritBadges()`, `validateApplication`)
- Variables: camelCase. Classes: PascalCase. Constants: SCREAMING_SNAKE_CASE.
- Database fields: snake_case (`first_name`, `bsa_member_id`, `created_at`)

### Patterns

- Import order: external packages, then relative imports, then type/class defs, with dotenv config at top of file.
- Async: async/await with try-catch. Routes pass errors via `next(error)`. DB uses promise-based mysql2 pool with transactions (`beginTransaction()` / `commit()`).
- API responses follow `{ success: boolean, message?, data? }`.
- Validation: client-side HTML5 + Bootstrap feedback, server-side Express Validator. Multer `fileFilter` blocks executable extensions.
- SQL: parameterized queries only (`?` placeholders).

### Schema

Four InnoDB tables: `applications`, `merit_badges` (150+ seeded), `application_badges` (junction, `badge_type` enum counsel/drop), `certifications` (file metadata). Indexes on email, district, created_at, application_id, merit_badge_id.

### Commands

- `npm start` - production server (requires `.env`)
- `npm run dev` - nodemon auto-reload
- `npm install` - dependencies

Deploys to Namecheap cPanel (Node.js app, startup file `server.js`, `public/uploads` at 755). No formal test suite yet, verify manually in a browser at `http://localhost:3000`.
