# Learnings — MR/Passthrough Review & Copilot Handoff Session

**Date:** 2026-05-26
**Project:** vr-media-viewer
**Context:** Reviewed the uncommitted MR/passthrough diff, wrote 7 task specs for a Copilot handoff, watched the first handoff fail to produce code, and pivoted task tracking from local markdown files to GitHub issues.

---

## 1. Verify "done" claims before reviewing

**What happened**
The user reported that the coworker (Copilot) had completed Task 01 — the `isInVR` → `isInXR` rename. Before reviewing, I checked the actual state: no new commits, no stash, no remote branches, no new `isInXR` references in `src/main.ts`. The rename hadn't happened. Reporting that back honestly — instead of fabricating a review of work that didn't exist — kept us aligned with reality and surfaced the real next step (find out where the work went).

**Why it matters**
A misplaced "yes it's done" claim — from a teammate, an agent, or a tired memory — can send a reviewer chasing ghosts. The cost of one `git status` check is trivial compared to the cost of an imagined review, and an honest "I can't find the change" is more useful than a polite agreement.

**Next time**
Before opening any review, run `git status` + `git log -5` + a targeted grep for the symbol that was supposed to change. Also check remotes (`git fetch --all`), stashes, and worktrees. If you can't locate the change, ask where it lives — don't guess and don't invent a review.

---

## 2. Diffs hide omissions

**What happened**
The MR/passthrough diff added `castShadow = true` to `PanoViewer` and `SpatialViewer`. Reading the diff alone, that looked complete. Reading the *sibling files* (`FlatScreen`, `Sphere360`) revealed `FlatScreen` had been skipped. A `grep castShadow src/scene/` would have caught it instantly. A reviewer who only reads `git diff` will never see what's *missing*.

**Why it matters**
A diff is a positive description of change. It cannot tell you what *should* have been changed and wasn't. Pattern-application bugs ("every X should do Y") require checking every X, not just the ones that show up in the diff.

**Next time**
When a change applies a pattern, identify the full population the pattern should cover (every viewer mesh, every callsite of a renamed symbol, every reference to a deprecated API), then verify each member of that population — not just the diff's coverage. Grep is your friend.

---

## 3. Task specs for AI agents need explicit non-goals

**What happened**
The 7 task files include "Notes" sections with explicit anti-instructions: *"Sphere360 is intentionally NOT in scope"*, *"Don't pre-abstract now"*, *"Do not wire a caller for this"*, *"Don't widen the candidate list speculatively"*. These exist because AI coding agents reliably over-deliver — adding helpers, generalizing, fixing nearby code, refactoring for "consistency" that wasn't requested.

**Why it matters**
A spec that only describes the positive goal invites scope creep. With an AI agent, scope creep is the default behavior, not the exception. Constraining what *not* to do is half the spec. A clean 6-line diff from a well-scoped task is worth more than a 60-line diff that "improves" three unrelated things.

**Next time**
Every AI task spec should answer two questions: (1) what to change, (2) what to leave alone even if it looks like it should change. The second list is often longer than the first. Include the *reason* a thing is out of scope so the agent doesn't relitigate it.

---

## 4. Match tracking medium to audience

**What happened**
This session started with 7 local markdown task files in `docs/tasks/`. They were carefully written and self-contained. The moment we acknowledged the actual consumer was Copilot — a remote agent with no access to my local working tree — the local files became immediately obsolete. We pivoted to GitHub issues, which Copilot can actually see.

**Why it matters**
A task tracker is a communication channel. If the consumer of the tasks can't read the channel, the channel is broken regardless of how well-written each individual task is. The cleverness of the spec is irrelevant if the audience never receives it.

**Next time**
Before writing the first task, ask: *who else needs to read this?* If the answer is "any tool, agent, or person not at my keyboard", skip local files entirely and go straight to a system they can access (GitHub issues, Linear, etc.). The minute-saved-by-writing-locally is paid back tenfold when you have to re-host the content elsewhere.

---

## 5. Workflow preferences are first-class memory

**What happened**
After the GitHub-issues pivot, I saved a feedback memory: *"always use GitHub issues for task tracking on this project, never local files"*. Future sessions on this project will inherit that default without having to re-derive it from observation or re-litigate the decision.

**Why it matters**
Code conventions are recoverable — you can read the codebase and infer most of them. Workflow preferences are not. Whether the user wants brief vs detailed reports, GitHub issues vs Linear, batched vs incremental commits, terse vs explanatory updates — none of that lives in the repo. If you don't persist it, you'll guess wrong next session, and the user has to re-teach the same lesson.

**Next time**
When a user makes a clear workflow statement ("always do X", "never do Y", "use Z for this kind of thing"), save it as a feedback memory before doing anything else. Capture the rule *and* the reason — the reason lets future-you judge edge cases instead of mechanically applying the rule.

---

*Reflection by Claude (Opus 4.7), session ending 2026-05-26.*
