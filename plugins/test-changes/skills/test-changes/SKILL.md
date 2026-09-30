---
name: test-changes
description: Create and run the tests for the changes just implemented, following the team's Vitest testing guide for Amplify Gen 2 + React + TypeScript (unit and service tests, no E2E). Runs `pnpm test:cov:changed` (or the project's equivalent) as a diagnostic, scopes the current work with git, reads the changed code, writes the missing `*.unit.test.ts(x)` and, for `allow.*` rules and custom queries/mutations, `*.int.test.ts` next to the code reusing the project's mocks, and loops on `test:cov:changed` until every test passes and Lines ≥ 80%, Functions ≥ 80%, Branches ≥ 75% (or stricter project thresholds); then runs the project's typecheck and ESLint on the files it touched, and reports COMPLETE or INCOMPLETE. Never tests code outside the change set, never writes tests just to execute lines, never changes production code without asking. Use after finishing an implementation, e.g. "/test-changes", "/test-changes --base origin/integration", "/test-changes src/features/query", "write the tests for what I just changed".
argument-hint: "[--base <ref>] [paths...]"
---

# /test-changes — Test what was just implemented

You write and run the tests for **the change the user just implemented**, nothing else. You start from the project's changed-files coverage command (`pnpm test:cov:changed`) as a diagnostic, confirm the scope with git, understand the behavior the change adds or modifies, write the tests that are missing according to the team's testing guide, and keep looping (analyze → tests → coverage) until the coverage thresholds are met and every test passes. Then lint the files the run touched, check types with the project's typecheck and report the result.

Main loop:

```text
test:cov:changed (diagnostic) → git scope → understand the change → existing tests → test matrix
  → write unit/int tests → run them → coverage loop (test:cov:changed → below threshold? → uncovered lines → more tests → repeat)
  → lint (touched files) → typecheck → completion criteria → summary
```

Coverage plays two roles. As a **diagnostic**, the `Uncovered Line #s` of the report tell you where tests are missing; you decide from the code which behavior those lines implement. As a **completion condition**, the run isn't done while the applicable coverage is below the thresholds (see "Completion criteria"): "tests pass, but coverage is 78%" is not a finished run, it's the next iteration of the loop.

Argument received: `$ARGUMENTS` (optional):

- `--base <ref>` — the branch/ref the work started from (overrides detection in Step 1).
- `paths...` — limit the scope to these files or folders (intersected with the git change set). Each path must be relative, without `..` segments, not starting with `-`, and without shell metacharacters; ignore and report any that isn't.

Talk to the user in the language they are writing in (or the one their `CLAUDE.md` asks for). Test code, test names and comments follow the conventions of the project (check the language of existing test names before writing new ones).

---

## Hard rules (apply to every step)

1. **Only the change set.** Tests target the behavior of the files changed by the current work (Step 1). When the coverage command measures a changed file as a whole, that whole file is in scope, including code that existed before the change, because its thresholds must be met (Step 7). Files the current work didn't touch are never a target: never write tests for the rest of the project, never "improve" coverage of untouched files.
2. **Behavior, not files.** A changed file is not a test target by itself; the behavior it adds or changes is. Every test must trace back to one row of the test matrix (Step 4).
3. **Ownership doubt stops the run.** If you can't tell with confidence which changes belong to the current work, stop and explain before modifying any file (Step 1.5). Never modify, stash, revert or test uncommitted changes that clearly belong to other work.
4. **Production code is read-only by default.** Never change production code to make a test pass or to raise coverage. If a test reveals a real bug, show the evidence (input, expected, actual, `path:line`) and ask before fixing it (Step 6).
5. **Never hide failures.** No `.skip`, `.only`, `.todo`, `it.fails`, commented-out tests, `@ts-ignore`/`@ts-expect-error`, loosened types, lowered thresholds or config changes to make a run green.
6. **Use the project's own commands and infrastructure.** Scripts, configs, mocks and helpers come from the repository. Never invent a runner setup, a new config file, a new dependency or a new shared mock when the project already has one; ask before adding any of them.
7. **No remote side effects without confirmation.** Service tests hit a real Amplify sandbox. Never deploy (`ampx sandbox`, `ampx pipeline-deploy`), never run against a non-test environment, and ask before running service tests (Step 6.3). Never print secrets from `.env*` or `amplify_outputs.json`.
8. **No commit, no push, no destructive git.** You leave the tests in the working tree. Never `git stash`, `reset`, `checkout -- <file>`, `restore` or `clean`.
9. **Coverage is a completion condition, reached only with real tests.** The run isn't finished while the applicable coverage is below the thresholds ("Completion criteria"); keep iterating instead of reporting "tests pass, coverage is below target". But every test must verify a real behavior with Arrange → Act → Assert: never write a test only to execute lines, and never lower thresholds or change coverage globs.
10. **Every user decision is an `AskUserQuestion`.** Max 4 options; the recommended option first with ` (Recommended)` in its label. In non-interactive mode (`claude -p`) you can't ask: stop and print what needs deciding.

---

## Testing guide (source of truth)

These rules come from the team's guide "Pruebas unitarias y de servicio con Vitest" for Amplify Gen 2 + React + TypeScript. When the project's `CLAUDE.md`, `AGENTS.md`, docs or specs are more specific, follow the project; when they contradict a rule below, follow the project and mention it in the summary.

**Scope**
- Unit and service tests with Vitest. E2E is out of scope.
- Tests are created as part of the same change.
- Whatever can be tested with a unit test is tested with a unit test. Service tests are reserved for what needs a real AWS/Amplify backend.

**Every test**
- Follows Arrange → Act → Assert (Preparar → Actuar → Comprobar), visibly separated.
- Has at least one `expect` that checks a concrete result (value, call arguments, rendered text, thrown error, returned status).
- `toBeDefined()`, `toBeTruthy()` or "does not throw" alone are not assertions of behavior; assert the actual value.
- Its name describes the expected behavior (`returns the builder name when the id exists`, not `test 1` or `works`).
- No `.only`, `.skip` or `console.log` left behind.
- Independent of the order of the other tests.

**Location and naming**
- Next to the file it tests, inside its feature: `foo.ts` → `foo.unit.test.ts`, `Foo.tsx` → `Foo.unit.test.tsx`, service tests `*.int.test.ts`.
- No `__tests__` folders when the project follows the guide's layout.
- Shared mocks live in `test/mocks` (e.g. the `aws-amplify/data` client mock). Never create a local mock of `aws-amplify/data` when a shared one exists; configure the shared one per test.
- Never import internal files of another feature: only its `index.ts` or `testing/index.ts` (factories and fixtures).

**Unit tests** — functions, business logic, hooks, React components, Lambda handlers, utilities, data transformations, validations, error paths. Cover each branch the change introduced: `if/else`, ternaries, `??`, `?.`, early returns, `catch`.
- React: test from the user's point of view with Testing Library, preferring `getByRole`, `getByText`, `getByLabelText` (and `findBy*` for async). Never assert on CSS classes, internal ids or implementation details. Use `user-event` for interactions when the project has it.

**Service tests** — what can only be verified against a real Amplify sandbox: `allow.*` authorization rules, custom queries and mutations, behavior that depends on the real API/resolvers.
- Authorization is tested in both directions: what the authorized user **can** do and what the unauthorized user **cannot** do.
- Each test creates its own data and cleans it up (or isolates it with unique ids), and never depends on another test's data or order.
- Use the project's test users and integration helpers (e.g. `test/helpers`), never hard-coded credentials.

**Coverage** — general target 80%; higher for Lambda logic and utilities when the guide or project config says so. Coverage is a check, not a goal: never add tests without a meaningful assertion to reach it.

---

## Changed-coverage command

The flow is built around the project's changed-files coverage command. Resolve it once, before Step 0:

1. `package.json` script `test:cov:changed` → run it with the project's package manager (from the lockfile: `pnpm-lock.yaml` → `pnpm test:cov:changed`, `package-lock.json` → `npm run test:cov:changed`, `yarn.lock` → `yarn test:cov:changed`, `bun.lock`/`bun.lockb` → `bun run test:cov:changed`).
2. If it doesn't exist, look in `package.json` for an equivalent: a script whose name matches `cov`/`coverage` + `changed`/`related`/`diff` (e.g. `test:coverage:changed`, `coverage:changed`), or whose command runs Vitest with coverage over the changed files (`--changed`, `vitest related`, a `scripts/*changed*coverage*` file). Read the script (and the file it runs) to confirm what it does before using it.
3. If there is no equivalent, don't invent a script and don't edit `package.json`. When a coverage provider is installed (e.g. `@vitest/coverage-v8`), use Vitest directly over the change set once Step 1 has it: `npx vitest run --project <unit project> --coverage --coverage.include=<changed source file>` (one `--coverage.include` per file), plus the tests related to those files (`npx vitest related --run <changed source files…>` when the project's Vitest supports it). Say in the summary that no project script existed. With no coverage provider, continue without the diagnostic (git scope + code reading only), say so, and don't install one without asking.

**Thresholds.** Per metric, the applicable threshold is the stricter of the project's configuration (`coverage.thresholds` in `vitest.config.*`, or the thresholds the script enforces) and the testing guide's minimums: **Lines 80%, Functions 80%, Branches 75%** (and Statements 80% when the project configures it). Higher targets from the guide or the config (e.g. Lambdas, utilities) apply to those files.

**Reading uncovered lines.** The text table truncates long `Uncovered Line #s` values with `...`. When that happens, read the full list from a machine-readable report the run produced: `coverage/lcov.info` (lines `DA:<line>,0` are uncovered lines; `BRDA:<line>,<block>,<branch>,0` or `-` are untaken branches; anchor the patterns at line start so `BRDA` isn't read as `DA`), or `coverage/coverage-final.json` when present. Never guess the hidden part of a truncated list.

Read the script before the first run to learn: its default base (e.g. `origin/integration`) and whether it accepts `--base <ref>`; which files it measures (coverage include/exclude globs); whether it enforces thresholds (a non-zero exit only because coverage is below target is an expected diagnostic result, not a broken run); and where it writes reports (e.g. `coverage/coverage-summary.json` with the `json-summary` reporter). If the user passed `--base`, forward it when the script supports it; if it doesn't, tell the user the script uses its own base.

The command runs unit tests only; service tests (`*.int.test.ts`) never count toward it.

**Whole-project commands are out of scope.** Never run, and never try to make pass, scripts that test or measure the entire program instead of the change: the full unit suite (`test:unit`, `test`), whole-project coverage (`test:cov`), legacy suites kept under their own config (`test:legacy` or similar), a project-wide `lint` over `.`, or `build`. Their failures belong to code outside the current work. The changed-coverage command already runs the tests of the changed files and of the code that imports them (`vitest related`), which covers what the change can break nearby.

---

## Step 0 — Coverage diagnostic (first run)

1. Run the changed-coverage command resolved above. It is read-only for the source; run it before editing anything.
2. If it fails for a reason other than coverage (tests failing, compile error, missing dependency, bad base ref), record it: failing tests in the change set are part of the work (Step 6); failures elsewhere are reported as pre-existing; a broken environment (dependencies not installed, base ref missing) is explained, and you ask before installing or fetching.
3. Extract from the output (prefer the JSON summary file when it exists; otherwise the text table `File | % Stmts | % Branch | % Funcs | % Lines | Uncovered Line #s`):
   - the source files it measured (the changed/affected files),
   - per file: statements/branches/functions/lines and the uncovered line ranges,
   - files at 0% or with no test at all,
   - the tests it ran and their result,
   - whether each applicable threshold passed (Lines, Functions, Branches, and Statements when configured), in total and per file.
4. Keep this as the **initial diagnostic**. It feeds Step 1 (scope cross-check) and Step 4 (where tests are missing). Don't write tests yet.

---

## Step 1 — Discover the change set

1. `git rev-parse --show-toplevel` — if it fails: "This folder is not a git repository. Run `/test-changes` inside the project." **Stop.** Work from the repository root.
2. **Base ref** (first match wins):
   1. `--base <ref>` from `$ARGUMENTS` (must match `^[A-Za-z0-9._/-]{1,255}$`, no `..`, not starting with `-`, and `git rev-parse --verify "<ref>^{commit}"` must succeed).
   2. The base the project itself uses for changed tests: the default base of the changed-coverage command (`test:cov:changed`), `--changed <ref>` in a `test:changed` script, or a base branch named in `CLAUDE.md`/`AGENTS.md`. Using the same base as the diagnostic keeps both file lists comparable.
   3. The PR base if a PR exists for the branch and `gh` is available: `gh pr view --json baseRefName --jq .baseRefName` (prefixed with `origin/`).
   4. `git symbolic-ref --short refs/remotes/origin/HEAD`, then `origin/main`, `origin/master`.

   Then `git merge-base HEAD "<base>"` → `mergeBase`. Say which base you used and why. If the base is a remote ref that may be stale, mention it (don't fetch without asking).
3. **Collect** (read-only):

   ```sh
   git status --porcelain=v1 -uall
   git log --oneline "<mergeBase>..HEAD"
   git diff --stat "<mergeBase>" HEAD          # committed work on the branch
   git diff --stat --cached                    # staged
   git diff --stat                             # unstaged
   git ls-files --others --exclude-standard    # untracked (new files)
   git diff --name-status -M "<mergeBase>"     # tracked changes vs base, incl. deletions and renames
   ```

   If the current branch **is** the base branch (or `mergeBase` equals `HEAD`), the change set is only the uncommitted work.
4. **Classify each file**: `added` (new or untracked), `modified`, `deleted`, `renamed`; and by kind: production source, test file, `amplify/` backend (data schema `resource.ts`, functions/handlers, auth, custom queries/mutations), config, docs, generated/lock files. Docs, lock files, generated files (`amplify_outputs.json`, generated types, build artifacts) and assets are out of the test scope.
5. **Decide ownership.** The current work is the branch commits since `mergeBase` + staged + unstaged + untracked files, **unless** some of them clearly belong to other work. Signs that uncommitted changes are unrelated: they touch a feature/area that none of the branch commits or other changes touch, they are files the user edits for something else (local config, `.env*`, scratch files), or the branch name/commit messages point to a different topic.
   - All consistent → continue.
   - Some changes look unrelated → show them grouped (related / doubtful) and ask (header `Scope`): `Only the related changes (Recommended)` / `All changes` / `Let me choose` (then a multi-select of the groups or files) / `Stop`. Excluded files are never edited or tested.
   - Can't tell at all (e.g. no branch commits and many uncommitted changes across unrelated features, detached HEAD without a clear base) → explain what you see and why the scope is unclear, then ask the same question. In non-interactive mode, **stop** here without modifying anything.
6. If `paths...` were given, intersect the change set with them. If the result is empty, say so and **stop**.
7. If the change set contains no production source (only docs, config, tests or generated files), say there is no behavior to test, list what changed, and **stop** (if test files changed, offer to run them as in Step 6).
8. **Cross-check with the diagnostic** (Step 0):
   - Measured by the command and in the change set → in scope, **as a whole file**: its coverage must end up meeting the thresholds (Step 7), and its uncovered lines guide Step 4.
   - Measured by the command but excluded by the ownership check or `paths...` → out of scope: ignore its numbers, never write tests for it.
   - In the change set but not measured (coverage-excluded globs, `amplify/data/resource.ts` schemas and auth rules, files outside the coverage roots) → still in scope; analyze it in Step 2 (auth rules and custom operations usually need service tests, which coverage never measures).
   - The command's file list and git disagree beyond these cases (e.g. different base) → say so, and trust the git scope.
9. Show the inventory: base and merge-base, number of commits, and the file list with status, kind and initial coverage (`A  src/features/query/model/builders.ts · source · 42% lines, no test`).

---

## Step 2 — Understand the change

For each production file in the change set (start with the ones the diagnostic flags: no test, 0%, uncovered lines inside the diff, but analyze all of them — a file at 100% can still have new behavior that no test asserts, because coverage only proves lines ran):

1. Read its diff (`git diff "<mergeBase>" -- "<path>"`, which includes uncommitted changes to tracked files; the whole file for untracked ones).
2. Read the **whole file**, not only the hunks, and what it needs to be understood: the types it uses, the functions it calls, the feature's `index.ts`, and the callers of changed exports (`Grep` for the symbol and its imports). Follow the data flow far enough to know inputs, outputs and side effects. Don't write a test from the diff alone when context is missing.
3. Read the project guidance that applies: `CLAUDE.md`/`AGENTS.md` at the root and in the feature, and the spec/ticket docs for this work when they exist (e.g. `docs/<ticket>/specs/`), which often state the expected behavior and acceptance criteria.
4. For `amplify/` changes, read the data schema around the changed models/operations (e.g. `amplify/data/resource.ts`), their `authorization(allow => …)` rules, custom query/mutation definitions and their handlers.
5. For deletions and renames: find tests, mocks, factories or `testing/index.ts` exports that reference the removed/renamed code (`Grep`); they must be updated or removed in Step 5.
6. For each changed unit of code, write down the **behavior delta**: what it does now that it didn't before, or what it does differently, including the branches introduced (`if/else`, ternaries, `??`, `?.`, error paths) and the inputs that reach them. A change with no observable behavior (rename, move, type-only change, formatting, re-export, extraction with identical result) is **structural**: note it, don't invent a test for it.

---

## Step 3 — Inspect the existing tests

Before writing anything, learn how this project tests:

1. **Tooling**: `vitest.config.*` (projects and their `include` globs, environments, setup files, aliases such as `@` / `@test`, `mockReset`/`restoreMocks`, coverage config and thresholds), `package.json` scripts (`test`, `test:unit`, `test:int`, `test:feature`, `test:changed`, `test:cov`, `test:cov:changed`…) and the scripts they call, package manager from the lockfile (`pnpm-lock.yaml` → `pnpm`, `yarn.lock` → `yarn`, `bun.lock`/`bun.lockb` → `bun`, `package-lock.json` → `npm`).
2. **Shared infrastructure**: `test/mocks` (e.g. `amplify-data.ts`), `test/setup`, `test/helpers` (integration clients, test users), each feature's `testing/index.ts` (factories, fixtures).
3. **Nearby tests**: tests next to the changed files and in the same feature. Note name language and style, `describe` structure, how mocks are configured, how components and hooks are rendered (providers, wrappers, router), how service tests authenticate and clean up.
4. **Existing coverage of the change**: for each behavior delta, check whether an existing test already covers it (it may have been written during the implementation) or asserts the old behavior and is now stale.
5. If the project's layout differs from the guide (e.g. `__tests__` or `*.test.ts` without `unit`/`int`), follow the project for the files you add and mention the difference in the summary. A test file that matches no Vitest project `include` glob never runs: pick a name/location that is included.

---

## Step 4 — Build the test matrix

Build it internally (show it only if the user asks or when a decision needs it). One row per behavior, not per file:

| # | Change | File | Behavior to verify | Type | Action |
| --- | --- | --- | --- | --- | --- |
| T1 | new logic | `model/builders.ts` | returns the builder name when the id exists | unit | new `builders.unit.test.ts` |
| T2 | new logic | `model/builders.ts` | falls back to the id when the builder is unknown (`??`) | unit | same file |
| T3 | modified component | `ui/Search.tsx` | shows the empty-state message when the query returns nothing | unit | update `Search.unit.test.tsx` |
| T4 | new auth rule | `amplify/data/resource.ts` | owner can update their record | int | new `*.int.test.ts` |
| T5 | new auth rule | `amplify/data/resource.ts` | other users can't update it | int | same file |
| — | rename | `lib/format.ts` | structural, no behavior change | none | — |

**Choosing the type**
- `unit` — anything that can be exercised with mocks: functions, hooks, components, handlers (call the handler with a built event and mocked clients), validations, transformations, error handling. Default choice.
- `int` — only when the behavior lives in the real backend: `allow.*` rules and authorization, custom queries/mutations and their resolvers, behavior that depends on the real API. The handler **logic** behind a custom operation is still unit-tested; the service test checks wiring and authorization.
- `none` — structural change, already covered by an existing test (name it), or not testable in this stack (say why).

**Choosing the action**
- An existing test file for that source → add to it, or **update** the test that asserts the old behavior. Don't create a parallel file.
- An existing test already checks this behavior → `none (covered by <file> › <test name>)`. Don't duplicate.
- Otherwise → new file next to the source.

**Depth**: one test per meaningful case (happy path, each introduced branch, error path, boundary the change actually handles). Don't enumerate inputs that exercise the same branch. Don't test third-party libraries, React itself or Amplify's generated code.

**Using the diagnostic**: map each uncovered range from Step 0 to the behavior it implements, starting with the ranges inside the diff (or code the change made reachable), then the rest of the file. Behavior not yet in the matrix → add a row. Uncovered lines of files outside the change set are never rows. Uncovered lines that are unreachable, purely defensive or trivial (a re-export, a type guard that can't fail) → note them, no row; the thresholds are still reached through real behavior elsewhere in the file.

Check the matrix against the inventory: every production file in the change set must have at least one row (even if `none`), so no change is forgotten.

---

## Step 5 — Write the tests

1. Create or update the `*.unit.test.ts(x)` / `*.int.test.ts` files from the matrix, reusing the project's mocks, factories, helpers, render utilities and naming. Import other features only through their `index.ts` or `testing/index.ts`.
2. Each test: Arrange → Act → Assert, a name that states the behavior, a concrete `expect`. Configure the shared `aws-amplify/data` mock per test (e.g. `amplifyClient.models.X.list.mockResolvedValue(...)`) and assert the calls that matter (with their arguments, not only "was called"). Don't rely on state left by another test.
3. Components: render as the user sees them, query by role/text/label, interact through events, assert what appears, changes or is called. Async UI: `findBy*`/`waitFor`, not timers or sleeps.
4. Service tests: sign in with the project's test users, create the data the test needs with unique identifiers, clean it up in `afterEach`/`afterAll` (or the project's equivalent), cover both directions of authorization, and assert the specific error/denial the API returns.
5. Deleted or renamed code: update or remove tests, mocks and factory exports that referenced it. Remove a test only when the behavior it tested was intentionally removed, and say so in the summary.
6. When a behavior is hard to test because of how the production code is written (hidden dependency, no seam), test it through its public surface if possible; otherwise mark the row `none` with the reason. Don't refactor production code for testability without asking.
7. Before running, re-read your test files for leftovers: `.only`, `.skip`, `console.log`, unused imports, `toBeDefined()` as the only assertion.

---

## Step 6 — Run the tests

Run the new and updated tests quickly before re-running the diagnostic, so failures are fixed with a short loop.

1. **Pick the commands** from the project (Step 3), in this priority:
   1. Tests of the affected feature(s): e.g. `npm run test:feature -- <feature> unit` (`all` when there are service tests and they may run, see 3).
   2. Tests of the changed files: e.g. `npm run test:changed`, or `npx vitest run --project <unit project> <test files…>` when there is no script.

   Use the detected package manager (`pnpm test:feature -- …`). Always run mode; never start watch mode.
2. Show the commands with their source (`pnpm test:feature -- query unit — package.json scripts.test:feature`) and run them. If dependencies aren't installed, ask before installing.
3. **Service tests** need a deployed test sandbox and its configuration (e.g. `amplify_outputs.json`, `.env.test`, test users). Check that the configuration exists without printing its values. Then ask (header `Service`): `Run service tests (Recommended)` (only recommended when the configuration exists) / `Only write them, don't run` / `Skip service tests`. Never deploy a sandbox yourself; if it's missing, give the user the command the project documents to start it.
4. **When a test fails**, classify the cause:
   - **Test is wrong** (setup, expectation, query, mock not configured, async not awaited) → fix the test and re-run. Max 3 attempts per test; then report it as unresolved with the last error.
   - **Environment** (missing config, sandbox down, dependency missing) → report, don't work around it.
   - **Pre-existing** (an existing test that also fails without the change) → when unclear, offer to run it on `HEAD` in a temporary worktree (`git worktree add "<tmpdir>" HEAD`, run, `git worktree remove "<tmpdir>"`), which doesn't touch the user's working tree. Report, don't fix.
   - **Real bug in the implementation** → don't touch production code yet. Show the evidence (input, expected vs actual, `path:line`) and ask (header `Bug`): `Fix the implementation` (recommended only when the fix is small and inside the change set) / `Keep the test failing and report it` / `Adjust the test (current behavior is intended)`. Never make the test pass by weakening it.
5. Re-run the affected commands after every fix until green or until only reported failures remain.

---

## Step 7 — Coverage loop (mandatory)

Passing tests don't end the run. Repeat this loop until the completion criteria are met:

1. Run the changed-coverage command (same command and base as Step 0).
2. Check that every test passed, then read the totals and each measured file against the applicable thresholds (Lines, Functions, Branches, and Statements when configured). A non-zero exit caused by thresholds means "keep going", not "done" and not "broken".
3. **Classify every shortfall:**
   - **A — caused by the current work**: files of the change set that the command measures, below threshold. This includes code in those files that existed before the change, because the command measures the whole file. → Close it with tests (points 4-7).
   - **B — pre-existing and unrelated**: files the command measures that aren't part of the current work (excluded by the ownership check or `paths...`, or pulled in by the script's base or globs). → Don't write or change tests or code for them. Name them with their numbers as the reason the global gate can't pass, and ask the user (header `Coverage`): `Narrow the scope or base so only the current work is measured (Recommended)` / `Also cover these files` / `Stop here`. Until that's resolved the run is **not** successful.
4. For each A file below threshold, take its uncovered lines, branches and functions (the full list, see "Reading uncovered lines") and read that code: what behavior does each range implement (a branch, a fallback, an error path, an event handler, a render case, a column sort, an empty state)?
5. Read the file's existing tests first: extend them instead of duplicating cases, and reuse their helpers and mocks.
6. Add the rows to the matrix and write the tests (Step 4 → Step 5): `*.unit.test.ts(x)` for logic, hooks, components, transformations, validations, errors and branches; `*.int.test.ts` only for behavior that needs the Amplify sandbox (`allow.*` authorization, custom queries and mutations), which this report never counts. Every test asserts a real outcome (what the user sees, what is called and with which arguments, what is returned or thrown) with Arrange → Act → Assert, driven through the public surface (props, URL params, user events, function arguments).
7. Run the new tests (Step 6), fix what fails, and go back to 1.

**When the loop can't reach the thresholds honestly**, stop and report the run as **incomplete**, never as done:
- the remaining uncovered code can't be reached from any public behavior (dead code, impossible branch), so only an artificial test would cover it;
- two consecutive rounds added no coverage although real behaviors were tested;
- a real bug blocks the tests (Step 6.4).

In those cases show, per file, the numbers, the exact uncovered lines and why they can't be covered with a real test, and ask the user how to proceed (header `Coverage`), e.g. `Remove the dead code (production change)` / `Accept below threshold for now` / `Stop`. Never lower thresholds, edit coverage globs or add assertion-free tests to get out of the loop.

---

## Step 8 — Lint and TypeScript

Last checks, after the coverage loop is green. If one of them makes you change a test, re-run the affected tests and the changed-coverage command before finishing.

**Lint (only the files this run touched).**
1. Read the project's `lint` script (e.g. `eslint . --ext ts,tsx --report-unused-disable-directives --max-warnings 0`) and keep its flags, but replace the `.` target with the files this run created or modified plus the change-set source files: `pnpm exec eslint <same flags> <files…>` (use the detected package manager). Never lint the whole project.
2. With no `lint` script, use ESLint directly only when the project has an ESLint config (`eslint.config.*`, `.eslintrc*`); otherwise say there is no linter and skip it.
3. Errors or warnings (the script's `--max-warnings` counts) in the tests you wrote or updated are yours to fix (unused imports and variables, hook rules, `no-explicit-any`…), without disabling rules or adding `eslint-disable` comments.
4. Findings in production files of the change set are the user's code: show them and ask before changing anything (hard rule 4). Findings that already existed before the change are reported, not fixed.

**TypeScript.**
1. Prefer the project's `typecheck`/`type-check` script: it knows every tsconfig the project checks (e.g. `tsc --noEmit && tsc -p amplify/tsconfig.test.json`, where the second one covers the backend tests that the root `tsc` doesn't see). Read it before running it.
2. Without a script, run `npx tsc --noEmit` plus `tsc -p <config> --noEmit` for every other tsconfig that includes test files; if no tsconfig includes the tests, say so.
3. Errors in the new/updated test files are yours to fix. Errors in change-set production files: show them and ask. Errors in files the current work didn't touch are pre-existing: report them (worktree comparison as in Step 6.4 when unclear) and don't fix them.

---

## Completion criteria

`/test-changes` is successful only when **all** of these hold:

1. Every test in the changed-coverage run and in the affected feature(s) passes.
2. The applicable coverage meets every threshold (Lines ≥ 80%, Functions ≥ 80%, Branches ≥ 75%, Statements when configured, or the stricter project values), both in the command's totals and for each measured file of the current work.
3. The changed-coverage command exits successfully (when it enforces thresholds).
4. The project's typecheck (or `npx tsc --noEmit` plus every tsconfig that includes tests) reports no errors caused by the current work.
5. ESLint, with the project's flags, reports no errors or warnings in the files this run touched.
6. Every change-set file has a matrix row: tested, or `none` with a reason (structural, already covered, service test).
7. No production code was changed without the user's approval, and no test was skipped, weakened or made assertion-free.

If any criterion fails, the result is **INCOMPLETE**: say which one, why, and what's needed to finish. "Tests pass but coverage is below the thresholds" is never reported as success.

---

## Step 9 — Summary

Start with the result: **COMPLETE** (all completion criteria met) or **INCOMPLETE** (list the failing criteria). Then report, concisely:

1. **Scope**: base and merge-base; the change-set files analyzed (status + kind); files excluded by the user or the ownership check, with the reason.
2. **Tests created** (new files) and **tests updated** (existing files), each with the behaviors it covers (`T1 returns the builder name when the id exists — unit`).
3. **Not tested and why**: structural changes, behaviors already covered (naming the existing test), service tests written but not run, anything not testable here.
4. **Commands run**, each with ✓ / ✗ / not run and a one-line result (`✓ pnpm test:feature -- query unit — 24 passed`), including the changed-coverage command, the lint command with the files it checked, and the typecheck command (or why one wasn't available).
5. **Coverage** from the changed-coverage command: totals and each measured file, Lines / Functions / Branches (and Statements) before (Step 0) → after (Step 7) against each threshold with ✓/✗, the number of loop rounds, remaining uncovered lines with their reason, and any B shortfall (pre-existing, unrelated) named separately.
6. **Problems**: failing tests with their classification (test / environment / pre-existing / implementation bug), lint and TypeScript findings (fixed, pending your decision, or pre-existing), bugs found and whether they were fixed with the user's approval.
7. **Production code changed**: normally "none"; otherwise each change and the approval behind it.
8. `git status --short` of the files this run created or modified, kept apart from the user's own changes.
9. **Test list**: every test in the test files of the change set (the ones this run created or updated and the ones that already existed for those files), as a Markdown table, grouped by file in the same order as the scope:

   | # | File | Test | Type | Status | Result |
   | --- | --- | --- | --- | --- | --- |
   | 1 | `ui/PartUsageSearch.unit.test.tsx` | PartUsageSearch · columna Armador › Reintentar vuelve a leer UserProfile y muestra el nombre | unit | new | ✓ |
   | 2 | `ui/PartUsageSearch.unit.test.tsx` | PartUsageSearch · columna Armador › muestra el nombre del perfil aunque la copia sea el ID | unit | existing | ✓ |
   | 3 | `amplify/data/builder-auth.int.test.ts` | otro usuario no puede actualizarlo | int | new | not run |

   - **File**: path relative to the feature (or the repository root outside `src/features`).
   - **Test**: the full name as the runner reports it (`describe › it`), in the project's language, exactly as written. Each case of an `it.each` is its own row, with its interpolated name.
   - **Type**: `unit` / `int`.
   - **Status**: `new` (added by this run), `updated` (existed and this run changed it), `existing` (untouched).
   - **Result**: ✓ passed, ✗ failed, `not run` (e.g. service tests without a sandbox).
   - Take names and results from the last run, not from memory: run the change set's test files once more with a machine-readable reporter written outside the repository, e.g. `pnpm exec vitest run --project <unit project> <test files…> --reporter=json --outputFile=<temp dir>/test-changes-results.json`, and read that file. Service tests that weren't run are listed from their source with `not run`.
   - Put the table headers in the user's language. After the table, one line with the totals: `174 tests · 67 new · 5 updated · 102 existing · 174 ✓ · 0 ✗`.

Don't commit. If the user asks for a commit, stage only the files from this run and follow the repository's commit conventions.
