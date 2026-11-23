# Agent instructions (OpenAI Codex)

This project is worked on alternately by **OpenAI Codex** and **Claude Code (T3 Code)**. Neither agent can see the other's conversation history. `PROJECT_CONTEXT.md` is the shared memory between them.

## Before starting any task
1. Read `PROJECT_CONTEXT.md` in full. Treat its status, decisions and known issues as the latest truth; verify against the code when something matters.
2. Read the topic doc for the area you touch (listed in PROJECT_CONTEXT §4), e.g. `LAUNCH.md`, `GOOGLE-SETUP.md`, `PROJECT-PAGES.md`.

## While working
- Respect the recorded design and architectural decisions (PROJECT_CONTEXT §2 and §7): no frameworks or new dependencies, no Calendly, Excon Variable only, motion soft and eased with reduced-motion support, never fake delivery. Change a decision only when the owner asks, and record the change.
- Before building something, check that it doesn't already exist (`public/assets/components/`, `scripts/build.mjs`, `lib/`). Extend it rather than duplicate or contradict it.
- Anything in `experiments/` is unpublished work. Don't ship it, delete it or move it into the build without the owner's request.
- Never commit, print or upload `.dev.vars`, `.local/` or credentials. Don't push, deploy or change domains/DNS without explicit approval.
- Run `npm test` after code changes and report failures honestly. Node may not be on PATH: use `~/.nvm/versions/node/v24.13.0/bin`.

## Before finishing any meaningful task
Update `PROJECT_CONTEXT.md`:
- Status (§8), implemented/planned features (§5/§6) using the ✅/🟡/💭 legend. Only mark ✅ what you verified.
- Significant decisions with date and reason (§7). Known issues (§9).
- Unfinished work and concrete next steps (§10), so the other agent can continue without your chat history.
- One change-log row (§11): date, agent name, what changed.
- Update the "Last updated" line. Keep the file concise and accurate: edit or remove outdated lines instead of appending contradictions; move long detail into topic docs.

Claude Code follows the same rules via `CLAUDE.md`. Keep the two files consistent.
