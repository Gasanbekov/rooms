# Rooms

Real-time chat with rooms. Education project: Node.js, WebSocket, PostgreSQL, deploy to VPS.

# Commands

- `npm run lint`: ESLint check
- `npm run format:check`: Prettier formatting check
- `npm run format`: Auto-formatting

Code must be linted and format-checked before every commit. The pre-commit hook handles this automatically.

## Rules

- Use Conventional Commits format: `feat:`, `fix:`, `chore:`, `docs:`.
- Never commit secrets, passwords and `.env`
- Do not bypass hooks (do not use `--no-verify`)
- Never rewrite published history, `--force` is strictly forbidden
- Do not modify the production server directly, deployment must only be done via script
