# Codebase Task Proposals

## 1) Typo Fix Task
**Issue found:** In `CHEF_README.md`, a sentence says "improve you app further".

**Task:** Replace "you" with "your" in the sentence "...guide for tips on how to improve you app further".

**Why it matters:** Fixes a visible grammar/typo issue in project docs and improves professionalism.

**Acceptance criteria:**
- The sentence reads "...improve your app further".
- No other wording changes in that bullet.

---

## 2) Bug Fix Task
**Issue found:** `CameraManagement` sends extra fields (`username`, `password`, `codec`, `aiModes`, `allowedIpRanges`, and `settings`) when calling `api.cameras.addCamera`, but the Convex mutation only accepts `name`, `rtspUrl`, `location`, `resolution`, and `fps`.

**Task:** Align the frontend payload and backend mutation schema for camera creation.

**Suggested implementation direction:**
- Either (A) update `convex/cameras.ts:addCamera` args and insert logic to support the extra fields actually collected in the UI, or (B) restrict the frontend request to only currently supported fields and remove unsupported form fields until backend support is added.
- Prefer option A, because the form already exposes these fields to users.

**Why it matters:** Prevents runtime validation errors during camera creation.

**Acceptance criteria:**
- Creating a camera from the UI succeeds without Convex arg-validation errors.
- Persisted camera data matches the fields exposed by the form.
- Existing camera listing/stat cards continue to work.

---

## 3) Code Comment / Documentation Discrepancy Task
**Issue found:** `README.md` says the frontend uses **React 18**, but `package.json` pins `react` and `react-dom` to `^19.0.0`.

**Task:** Update `README.md` architecture section to match actual dependency versions.

**Why it matters:** Keeps setup/architecture documentation trustworthy for contributors.

**Acceptance criteria:**
- README frontend stack version aligns with `package.json`.
- Any related version mentions are internally consistent.

---

## 4) Test Improvement Task
**Issue found:** There is no dedicated automated test coverage for camera payload compatibility between frontend submission and Convex mutation args.

**Task:** Add a test that guards against frontend/backend payload drift for camera creation.

**Suggested implementation direction:**
- Add a frontend unit/integration test (e.g., with Vitest + React Testing Library) that verifies the object passed to `addCamera` only includes backend-supported fields **or**
- Add a shared typed contract module for create-camera payload and test both sides against it.

**Why it matters:** Catches regressions early when form fields or mutation args change.

**Acceptance criteria:**
- Test fails if unsupported keys are submitted to `addCamera`.
- Test passes with the intended create-camera payload shape.
- Test is wired into CI/lint script (or documented test command).
