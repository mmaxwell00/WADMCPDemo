---
name: docker-demobuilder
description: Build a customer-facing Docker demo end to end — take a customer use case, map it to the Docker products that actually solve it, build working demo assets, verify every beat live, and produce the full presenter kit (runbook, day-of guide, talking points with Q&A, slide deck, and a step-by-step guide page anyone can present from). Use when asked to create, build, design, or stage a customer demo, POC, workshop, or product walkthrough, or when turning a customer problem or use case into something demonstrable. Covers narrative design, asset build, live verification, stage-proofing for a room, and publishing to a repo.
user-invocable: true
---

# docker-demobuilder

Turn a customer use case into a demo that survives a live room.

> **Install:** copy this single file to `~/.claude/skills/docker-demobuilder/SKILL.md`
> (creating the directories). It is self-contained — no other files required.
> It then appears as `/docker-demobuilder`.

The failure mode this skill exists to prevent: a demo that *reads* well, *sounds*
well-researched, and then promises something the actual commands don't do — in
front of 40 people. Everything below is ordered to catch that early.

## What you produce

A self-contained repo with **working, verified assets** plus a presenter kit:

```
README.md              What it is, requirements, how to run
PROJECT.md             The record: decisions + why, verified state, gotchas
DEMO-DAY.md            One page to follow while presenting
runbook.md             Keystroke-level beats, fallbacks, trim plan
talking-points.md      The talk + prepared Q&A answers
docs/index.html        Step-by-step guide (what to type / see / SAY)
slides/*.pptx          The deck
demo/setup.sh          Idempotent bring-up that self-verifies
demo/reset.sh          Full teardown
<assets>/              The actual working thing being demonstrated
```

Not every demo needs all of it. A 10-minute internal walkthrough needs the
runbook and the assets; a customer talk needs the lot.

---

## Phase 1 — Frame the use case

Pin these before designing anything. Ask the user; don't assume.

- **The customer's problem**, in their words — the thing blocking them today.
- **Audience**: technical? security? executive? mixed?
- **Room size**: a desk demo and a 40-person talk are different products
  (see Phase 8).
- **Time budget**, split across talk / demo / Q&A.
- **What "success" looks like** — what should the room believe afterwards?

Write the one-sentence value claim now, and keep testing the build against it:
> *"The blocker to X is Y. This is how you get past it."*

## Phase 2 — Map the use case to products

Name the specific Docker capability that solves it, then — critically — **pin
what it does NOT do.** Most demo credibility is lost by overclaiming.

For each capability, write one line of "this is the honest mechanism." If the
honest mechanism is less magical than the marketing, *lead with the honest one* —
a technical room respects it and it's usually the stronger claim.

## Phase 3 — Verify BEFORE you build

**This is the highest-value phase. Do not skip it.**

Model knowledge of fast-moving Docker tooling is routinely stale — CLI flags,
subcommands and product names drift between releases.

1. **Check the live docs** (`WebSearch`/`WebFetch` on docs.docker.com) for every
   load-bearing claim.
2. **Check the installed CLI** — `<tool> --help`, `<tool> <subcmd> --help`,
   `<tool> version`. The help text is ground truth; the docs may lag it.
3. **Reconcile** the two and note the version you built against.

Record anything surprising in `PROJECT.md` as you go. Examples of the kind of
thing this catches: a status banner that doesn't reflect actual enforcement; a
log stream that doesn't contain the events you assumed; an admin UI that's
invisible to a non-owner account.

## Phase 4 — Design the narrative

- **The one-variable rule.** Across the beats, change exactly one thing and hold
  everything else identical — same task, same tool name, same command. If the
  tool *also* changes between the "bad" and "good" beats, the audience feels the
  seam even if they can't name it.
- **Three beats** is the natural shape: *problem happens → control stops it →
  approved path works.* Add a fourth only if it's under 30 seconds and proves
  something the others don't.
- **The payoff must actually happen.** If the closing beat promises a real
  action, make the demo perform that action. A log line is not a payoff.
- **Name the ah-ha moments explicitly** and put them in the presenter materials.
  If you can't name 3–4, the demo isn't finished.

## Phase 5 — Build the assets

- Smallest thing that shows the real mechanism. Resist building a product.
- **Deterministic beats a live LLM on stage.** If a step depends on a model
  choosing to do something, it will eventually not. Script it, and prepare the
  honest answer for *"did the AI really do that, or did you script it?"*
- Use decoy/fake data for anything resembling a credential, and label it as such
  in the file itself.
- No shell interpolation of user-supplied values (`execFile` with an arg array,
  not a shell string).

## Phase 6 — Verify every beat live

Run it. Do not reason about whether it works.

- Execute each beat end to end and capture the **real output** — you will paste
  it into the docs, and it must match what the room sees, including noisy INFO
  lines the presenter has to talk over.
- Verify the negative cases too (the thing that should be blocked *is* blocked,
  and for the right reason).
- Time each beat. Commands are usually near-instant; if so, say so — it tells the
  presenter all their time is narration.

## Phase 7 — Presenter materials

The guide must let **someone who didn't build it** present it. Each step needs
four parts, in the same place every time:

1. **What it shows** — one plain-English line, no jargon.
2. **Say this** — verbatim narration, written to be read aloud.
3. **Run this** — the exact command, copyable.
4. **Should look like** — real captured output, decisive line highlighted.

Then: prepared Q&A (write answers for the awkward questions, not the easy ones),
a troubleshooting table, and a cut order for running long.

For slides, diagrams, the guide page and the scripts, see
**Building the visual assets** below.

## Phase 8 — Stage-proof it (scales with room size)

For anything above a desk demo:

- **Remove network dependencies from the payoff.** Warm caches, use offline
  flags, pre-pull images. Venue Wi-Fi will be bad.
- **Remove cold starts.** Pre-warm long-running resources and make scripts
  *reuse* them rather than recreate. Then make sure your own setup script
  doesn't destroy the warm state (this is a real bug people ship).
- **Legibility**: terminal ~18–20pt, browser zoom ~150%.
- **Pre-open and pre-filter** anything web-based; deep-link filtered URLs rather
  than driving fiddly menus live. Screenshot them as fallbacks.
- **Sessions expire** — logins, tokens, tunnels. Tell the presenter to
  authenticate the morning of, and make the setup script check.
- Give the presenter a **cut order** and note which beat must never be cut.

## Phase 9 — Cold-read review, then publish

You cannot review your own guide — you know too much. Run a **context-free
reviewer**: an agent that clones only the published repo and tries to follow the
guide as a stranger, reporting blockers, unstated prerequisites, and
contradictions. Fix what it finds. This reliably catches things the author is
blind to.

Before publishing publicly:
- **Genericize tenant identifiers** — org names, account names, emails, internal
  IDs — to placeholders, and keep the real values in a **gitignored** local notes
  file. Verify with a grep that nothing leaked, *including inside binary assets
  like `.pptx`*.
- Use a noreply commit author so personal email stays out of commit metadata.
- `.gitignore` dependencies, build output and downloads.

---

## Hard rules

1. **Never assert product behaviour you haven't verified in this session.** Say
   "unverified" plainly rather than implying it was tested.
2. **When you correct something mid-build, sweep every doc for the old claim.**
   Fixing one file and leaving three contradicting it is the most common defect
   in this kind of work — and it sends the presenter debugging a non-problem.
3. **The honest mechanism beats the magical one.** Explain what the product
   actually does; a security audience will test you on it.
4. **Rehearse the scripts.** They have bugs. Every rehearsal in practice has
   found at least one.
5. **Report failures faithfully.** If a step is unverified or a session expired,
   say so — don't let a green summary imply coverage you don't have.

## Common failure modes

| Symptom | Cause |
|---|---|
| Closing beat underwhelms | The payoff was described but never performed |
| Presenter debugs a non-problem | A doc still asserts something you disproved |
| Payoff dies on venue Wi-Fi | Live network call in the final beat |
| 60 seconds of dead air | Cold start not pre-warmed, or setup destroyed the warm state |
| "That's not what the CLI says" | Built from model memory instead of `--help` |
| Guide works only for its author | No cold-read review |
| Internal names in a public repo | Genericization skipped, or skipped inside binaries |

## Building the visual assets

Covers the slide deck, diagrams, the guide page, and the
scripts — with the toolchain gotchas that cost real time.

---

### The guide page (`docs/index.html`)

A single self-contained HTML file. Works as a GitHub Pages site (`/docs` folder)
*and* can be published with the `Artifact` tool for an instantly shareable link.

Load `artifact-design` before writing it. Treatment is **utilitarian** — someone
reads it standing in front of a room, so craft goes into information design, not
decoration.

The structural job: make **"what you say"** and **"what you type"** instantly
distinguishable under pressure. Give the narration its own visual treatment
(distinct background + larger type) so a presenter can find it mid-sentence.

Per step, in this order every time:

```
[number]  Step title                                   ~time
          One plain-English line: what this shows

SAY THIS        ← verbatim narration, visually loudest block
RUN THIS        ← exact command, copy button
SHOULD LOOK LIKE ← real captured output, decisive line highlighted
THE MOMENT      ← why it lands (optional)
```

Plus: requirements up front, a pre-flight section, closing lines, prepared Q&A,
and a troubleshooting table.

**Details that matter:** copy buttons that strip the `$` prompt; `overflow-x:auto`
on every code block; semantic colour for allow/deny states separate from the
accent hue; real captured output including the noisy lines the presenter narrates
over.

---

### Slides (`.pptx`)

Load the `pptx` skill. Build with `pptxgenjs`.

**Gotchas that will cost you time:**
- The oval shape is `ellipse`, not `oval`, in the `ShapeType` enum — a wrong name
  throws *"Missing/Invalid shape parameter"*.
- Set `pres.layout = "LAYOUT_WIDE"` **before** adding slides (13.33×7.5in).
- Hex colours: six digits, **no `#`**, no alpha — both corrupt the file.
- `pptxgenjs` may not be preinstalled; `npm install pptxgenjs` if `require` fails.
- Every `addText` needs `isTextBox: true`.
- Run the pptx validator after writing.
- **Many environments have no LibreOffice**, so you cannot render slides to images
  for visual QA. Validate the file and content, then **say plainly that visual QA
  wasn't possible** and ask the user to eyeball it. Do not imply you checked.

**Deck shape** for a ~15-minute demo talk (~9 slides): title · the problem ·
the threat/challenge landscape · the solution diagram · the honest claim ·
the demo bridge · what they'll see (mock output) · why it generalises · takeaway
and sources.

Put **speaker notes on every slide** (`addNotes`) drawn from the talking points.

Check any citation you put on a slide. If a standard is in beta or draft, say so
on the slide rather than being corrected from the floor.

---

### Diagrams

Prefer drawn shapes (rounded rects, arrows, labelled circles) over rasterising an
icon library — fewer dependencies, fewer failure modes, and it renders everywhere.

The most useful diagram is usually the **chokepoint/flow** one: actor → control
point → allowed path and blocked path, with the control's three jobs named on it.
Semantic colour carries the allow/deny meaning.

---

### The scripts

`setup.sh` — idempotent, path-independent (derive the repo root from the script's
own location), and it **self-verifies**: it should exercise the demo's success
*and* failure cases and print a clear `READY` / `NOT READY`. A presenter should
know it works before walking on.

Make it check the fragile things up front: authentication, the network dependency
the payoff needs, ports.

```bash
REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
```

**Background long-running processes so they can't hold a caller's pipe open**,
or piping the script's output hangs forever:

```bash
( cd "$DIR" && exec <cmd> ) >/tmp/log 2>&1 </dev/null &
```

**Kill by port, not by process-name pattern** — a pattern match silently misses
processes started with a relative path:

```bash
pids="$(lsof -ti tcp:"$PORT" -sTCP:LISTEN 2>/dev/null || true)"
[ -n "$pids" ] && kill $pids 2>/dev/null
```

**Preserve pre-warmed state.** If the demo has a warm resource, `setup.sh` must
keep a running one and clear only stale ones — otherwise re-running it before the
talk destroys the warm-up. Teardown belongs in `reset.sh`, not `setup.sh`.

**Report honestly.** Removing several named resources in one command returns
non-zero if any didn't exist, so a naive `&& ok || warn` prints "nothing to
remove" while having removed something. Loop and report per item.

`reset.sh` — full teardown of local state; leave server-side configuration (org
policies and the like) in place and say so.

---

### Cold-read reviewer prompt

Spawn a general-purpose agent with **no session context**:

> You are a [role]. A colleague handed you this repo URL and said "everything you
> need to run this customer demo is in here." You have never seen it and cannot
> ask questions. Clone it, read everything, and walk the setup and demo **on
> paper** as if doing it. At each step: do I have what I need, or is something
> assumed? Would this command work as written? Do any two documents contradict
> each other?
>
> READ-ONLY: do not run the repo's scripts or any state-changing commands.
>
> Report: verdict (could you run it cold?), blockers with `file:line`,
> ambiguities, inconsistencies, anything that could embarrass you in front of a
> customer, and the smallest set of doc edits that would most improve it. Be
> blunt; don't invent problems to seem thorough.
