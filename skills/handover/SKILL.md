---
name: tb:handover
description: Use when pausing or handing off work, wrapping up a session, or when context is about to run out and you need to preserve where you left off so a fresh session can resume — including writing a handover that branches off to a *new* goal to launch a fresh work thread rather than recording the current one. Also use to resume from an existing handover document. Triggers on "create a handover", "hand off this work", "pause work", "document where I left off", "save state before we compact", "context is getting full", "branch this work to a new goal", "make a kernel for a new direction", "resume from handover", or "pick up where I left off".
---

# Handover

Produce a `HANDOVER.md` that lets a **fresh session with zero memory of this conversation** resume the work — or read an existing one to resume.

The hard part is not writing things down. It is deciding *what not to write*. A handover that dumps the whole session is as useless as no handover: the next agent drowns in irrelevant context and re-derives nothing faster. The whole value of this skill is the filter below.

## Mode

- **Create** (default): write a handover for the current session.
- **Resume**: if `$ARGUMENTS` mentions "resume"/"continue"/"pick up", or points at an existing handover file, read it and continue the work. See [Resume mode](#resume-mode).

## Create mode

### 1. Anchor on the goal — and confirm it before sifting

Name the **one thing this session is trying to accomplish**, in a sentence or two. Everything else is judged by relevance to it: a fact earns its place only if the next agent needs it *to move the goal forward*. That judgment drives the entire filter in step 2, so the goal has to be *right before* you sift — anchor on the wrong one and you capture the wrong context, and nobody finds out until the next agent is lost.

So before filtering anything, surface the goal you've inferred and let the user confirm, correct, or **redefine** it:

> "I read this session's goal as: «goal». Write the handover for that — or are you branching off to a new goal from here?"

This is a deliberate branch point, which is exactly why you ask *before* sifting and not after: the whole filter is shaped by which goal you're serving. Three ways it goes:

- **Confirmed** → anchor on it and sift normally.
- **Corrected** → the session wandered, or you mis-read it; take the user's wording as the anchor.
- **A new goal — a work subbranch** → the user is using this handover to *launch a new direction*, not to record the old one. Anchor the kernel on the new goal. Now the session you're about to sift is mostly *old-goal* material, so filter it against the **new** goal: what you did toward the old goal — its state, decisions, dead-ends, next-steps — is dropped unless it still serves the new one. Dropping it is deliberate, not lossy: it keeps the old goal's assumptions from being smuggled into the fresh direction. What survives a goal change is the **references** — the `file:line`, tickets, commits, and docs you surfaced are goal-agnostic pointers, and they seed the subbranch. (Carve-out about the *pointer*, never the old conclusions: if a reference is only followable through something non-obvious — an MCP query, an outside source, research, not a plain in-repo path — carry *how to reach it*, not just the bare pointer; a pointer the next branch can't re-open is dead.) The output is a kernel that *starts* the subbranch, not a log of the trunk you're leaving.

If the goal is genuinely ambiguous and the user isn't around to ask, anchor on the most recent coherent thread and say so in the handover. Don't silently guess.

### 2. Filter every candidate fact

For each thing you're tempted to write down, run it through this filter. This is the skill.

**Is it a decision, or a dead-end?**
- A **decision** — a choice made and *why* (including "we ruled out X because Y") — is worth saving. It is not re-derivable and saving it stops the next agent re-litigating it. Save the decision, compactly; not the deliberation that led to it.
- A **dead-end** that produced no durable conclusion — the three things tried that just didn't pan out — is noise. Drop it. The exception is exactly the decision case above: if a dead-end yielded "approach X doesn't work because Y," that *is* a decision. Keep the one-line conclusion, not the journey. But if the root cause you *did* record already makes X obviously moot (you noted the race, so "a longer timeout won't help" is self-evident), even that one-liner is derivable — drop it too.

**Can it be drawn from the context that already exists?**
- If the next agent can re-derive it by reading the code, the diff, the docs, the tests, or git history — **do not reproduce it. Save a reference instead.** `auth/session.ts:42`, commit `a1b2c3d`, `LFCR-360`, the failing test name, the doc URL. Reproducing derivable content rots: the code moves, the copy goes stale, and you've added words that compete for attention without adding information.
- A reference is a pointer to where the knowledge lives. Prefer the most precise pointer available (`file:line` over file, file over "somewhere in the auth module").

**Is it obscure — non-discoverable from the context?**
- A fact that *cannot* be re-derived — "staging silently truncates strings over 255 chars, undocumented"; "the retry only fires on 503, not 500, by deliberate choice" — must be preserved, because it is lost otherwise. There's no source to reference, so write it inline. These are the highest-value lines in the document.

**Did it come from outside the model — research, a support ticket, an experiment, a buried doc?**
- A fact someone had to *find* — an undocumented API behavior, a version-specific quirk, a vendor's real rate limit, a compliance rule from a PDF — is the **highest-retention class of all**. The next agent can't reason it back (it isn't in the model) and, with no web, can't even re-look-it-up; losing it means re-doing the research from scratch, possibly landing somewhere different. Always keep it, *with its source* (forum thread, ticket #, GH issue, "found by testing") so the next agent can both trust it and re-verify it.
- A researched fact does **not** become disposable once you implement it. The code encodes *what* you did, never the non-recoverable *why*: `"acme-sdk": "^4.1"` in package.json doesn't tell anyone that v3.x silently breaks webhook signatures, so the next dependency cleanup will quietly undo it. Keep a compressed **constraint + source** line ("Acme SDK ≥ v4.1 — v3.x breaks webhook sig verification, GH #612; don't downgrade") until that rationale is written somewhere durable in the codebase (a code comment, an ADR). Only *then* is it safe to drop and reference. These researched invariants ride along in **Watch out** across every hop.

**Is it generic?**
- A generic statement ("improve error handling", "the API needs work") pulls the next agent toward a huge, mostly-irrelevant surface. Make it specific enough to point at the actual next move ("the token refresh in `auth/session.ts:42` drops the `Retry-After` header") — but don't over-explain. Specific and short beats vague-and-broad or correct-but-bloated.

The throughline: **save what can't be recovered, reference what can, drop the rest.**

### 3. Write `HANDOVER.md`

Default location: `HANDOVER.md` at the repo root (override with a path in `$ARGUMENTS`). Use this structure; omit any section that would be empty rather than padding it.

```markdown
# Handover: <short goal phrase>

## Goal
<1-2 sentences: what this session is trying to accomplish.>

## Current state
<Where things stand right now. What works, what's half-done, what's untouched.
Reference the artifacts (branch, files, failing test) rather than describing them.>

## Decisions
- <Decision + why, one line each. Include rejected options: "Chose A over B because C.">

## Next steps
1. <Concrete next action — specific enough to start without re-investigating.>
2. <...>

## Watch out
- <Obscure, non-discoverable facts + researched invariants (with source) that would trip up a fresh agent or get naively undone. These persist across hops until captured in code/an ADR. Omit if none.>

## References
- <Pointers to relevant context: `file:line`, commits, tickets, PRs, docs, URLs.>
```

### 4. If a handover already exists, distill — don't accrete

If you're handing off work that *already* has a handover (a second, third, Nth pass), do not append to it or merge both. Treat writing the new one as a **distillation pass**: re-run the filter in step 2 over every carried-over line against the goal *as it stands now*.

- Drop what's since been **resolved** — *unless* it leaves behind a researched invariant. The gotcha you fixed in a test is history; but a researched constraint you *implemented* (the retry that exists only because the API is eventually-consistent, the SDK floor that exists only because older versions break) is not resolved — it's load-bearing forever. Implementing it didn't make its *why* recoverable. Keep it as a one-line constraint + source.
- Drop what's become **derivable** — but only if the code reveals the *reasoning*, not just the result. The diff shows the retry loop exists; it does not say "don't remove this, the API 404s for 2s after create." A researched rationale behind shipped code stays as an invariant until it's captured in a comment or ADR.
- Keep, and **sharpen**, what's still open and still non-derivable. Re-ask "how specific is this to the goal as it is now?" and tighten accordingly.

A good second handover is *tighter and more goal-specific* than the first, because the goal has narrowed and work has resolved. The kernel should converge toward the still-relevant core, not grow by accumulation. The one thing that must survive every pass until it's resolved: an open, non-derivable fact (the unfixed gotcha) — losing it across hops is the cardinal failure.

### 5. Verify pieces by recoverability (optional)

You are the worst judge of your own handover: you just did the work, so every line feels obvious and findable. Fix that by testing each piece against a reader with none of your context — and test pieces *independently*, so a marginal line can't hide inside the doc's overall coherence.

When you want to tighten a doc (or on request), decompose it into atomic pieces — each decision, state claim, watch-out fact, next step, reference — and spawn one cheap, fast subagent per piece (Haiku-tier; each task is tiny — run them in parallel). Give each subagent only the **goal plus its one piece** — not the rest of the doc, not this session. Ask:

> "With no memory of the original session, could a fresh agent recover this fact — from the code, docs, tests, or git, or (if it cites a source) a quick web search? Answer recoverable or not, and if recoverable, from where."

Act on the verdicts:
- **Recoverable** → cut the piece, or downgrade it to the bare pointer the subagent found (`file:line`, commit, doc URL). Carrying recoverable prose is the bloat this whole skill exists to prevent.
- **Not recoverable** → keep it. This is the irreplaceable core.

Keep the cheap subagent's job narrow: it returns the recoverability verdict and whether the piece *cites an external source* — nothing more. **You** decide protected-class membership and apply the guard; don't outsource that to the cheap model, which tends to over-flag everything as "important."

**The guard — protected classes are never auto-cut.** An obscure non-discoverable fact, a researched/externally-sourced invariant, or a decision-with-rationale must not be deleted on a "recoverable" verdict alone. The asymmetry is the whole point: wrongly cutting a crown-jewel fact loses it silently and forever; wrongly keeping a filler line costs one sentence. So for these classes a "recoverable" verdict is a prompt to *add the missing reference/source* (or to flag it for the user to confirm), never an instruction to delete. Bias to retention wherever the downside is unrecoverable.

After the pass, order what survives so the not-recoverable, goal-critical pieces sit at the top — the things a fresh agent can't get anywhere else should never be buried under the things it can.

(The whole-document version of this check — does a cold reader actually resume correctly? — lives in the skill's eval harness, not in the per-handover path.)

### 6. Confirm

Tell the user the path and give a one-line summary of what you captured and what you deliberately left out (so they can catch a wrong omission). If you ran the recoverability pass, say so and note what it cut or flagged. Don't dump the file contents back.

## Resume mode

1. Locate the handover: the path in `$ARGUMENTS`, else `HANDOVER.md` at repo root, else the newest `HANDOVER*.md` you can find. If none exists, say so and offer to create one or run `tb:catchup` instead.
2. Read it. Then **follow its references** — open the cited `file:line`, read the ticket, check the commit — to rebuild the working context the doc deliberately did not reproduce. The doc is an index, not the whole story.
3. Restate the goal and the immediate next step back to the user in one or two lines, then continue the work. If a reference is now stale (file moved, test renamed), flag it rather than guessing.

## Principles

- The reader is a fresh agent with no memory of this session. Write for them, not as a log for yourself.
- Length is a cost, not a virtue. Every line competes for the next agent's attention; a line that re-states recoverable context makes the useful lines harder to find.
- When unsure whether to include something, prefer a reference over a reproduction, and omission over a generic restatement.
- Relevance is defined by the goal. A true fact that doesn't move the goal forward doesn't belong.
- Writing a handover is also a branch point, not just a snapshot. At creation you can anchor the kernel on a *new* goal instead of the session's — which is why step 1 confirms the goal before sifting, and why redefining it filters the session against the new goal: the references survive (with their retrieval path when that path is itself obscure) and seed the new direction, while the old goal's state, decisions, and next-steps drop.
- Successive handovers should **converge, not accrete**. Each pass re-judges every line against the current goal — the kernel gets sharper and smaller as work resolves, never larger by accumulation. But an open, non-derivable fact must survive every hop until it's fixed.
