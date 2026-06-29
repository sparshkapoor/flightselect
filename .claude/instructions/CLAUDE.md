# FlightSelect — Claude Code Instructions

## First Steps
Before making changes, read these files:
- `.claude/plan/PROJECT_PLAN.md` — Project architecture and design decisions
- `.claude/progress/CHANGELOG.md` — Full log of all changes and outstanding issues
- `.claude/instructions/INSTRUCTIONS.md` — Detailed working instructions and gotchas

## Critical Rules
1. **After every meaningful change, update `.claude/progress/CHANGELOG.md`** with what changed, why, and what files were modified. This is required for continuity across sessions.
2. **Never reason about code from memory.** Re-read the actual file(s) with the Read tool before planning or editing them — every session, even files you "remember" from earlier in the same conversation if significant time/work has passed. Prior-session recollection is unreliable and this codebase changes. This has caused real bugs (e.g. claiming a redesign shipped "glassy blur panels" that were never in the code).
3. **Code must match its design, not just claim to.** After implementing anything described as a "design" or "intent" (especially UI/visual work), re-open the changed files and verify the code actually reflects the stated design before reporting it as done. This project has a documented history of code drifting from its design — see `packages/client/DESIGN.md` for the current source of truth on the visual system, and check new UI work against it before calling it complete.
