## 2026-07-09: State Ownership Leftovers After Refactor

### What Happened
A GenerateForm refactor (0afe904) moved state ownership from the parent page into the form component using `useReducer`. Two stale references were left behind in the parent page, causing compile/runtime errors:

1. **Duplicate `prompt` declaration**: The page had two `const [prompt, setPrompt] = useState(...)` — one leftover from the old code, one from the new page-level state. Turbopack rejected this with "name `prompt` is defined multiple times", causing `/generate` and `/pricing` to 500.

2. **Missing `imageSize` reference**: `imageSize` was in the form's internal reducer but the parent page's `loadingParams` object still referenced `const imageSize` which no longer existed. Caused `ReferenceError: imageSize is not defined` at runtime on every `/generate` load.

### Root Cause
During the GenerateForm refactor, state was extracted from the page into the form via `useReducer`, but:
- The old `prompt` declaration was not fully deleted (only the new one's position was adjusted)
- The `imageSize` reference in `loadingParams` was never removed because the `HistoryPanel` component's `loadingParams` type also required it

### Lesson
**State ownership transfers during refactors create invisible dangling references.** The compiler catches undeclared variables only if Turbopack recompiles that exact module — but it can miss duplicates if both declarations coexist. The pattern to prevent this:

1. **Before committing a state-ownership refactor**, grep the parent for ALL variables that moved. Every destructured value from `useState` or `useReducer` that leaves the component creates a contract.
2. **Check all prop objects** passed to child components — they're the most common place dangling references hide.
3. **Verify via browser** — load every page that uses the refactored component and check the console for ReferenceErrors.
4. **When a component owns state internally**, any external preview of that state (like a loading badge in a sibling) must either be re-exposed via a callback or considered cosmetic enough to drop.

### Applied To
- `viewcreator-ui/src/app/generate/page.tsx` — removed duplicate `prompt` + removed `imageSize` from `loadingParams`
- `viewcreator-ui/src/components/generate/history-panel.tsx` — removed `imageSize` from `HistoryPanelProps` and `LoadingSkeleton`

### Trigger
- Turbopack compile error: "the name `prompt` is defined multiple times"
- Browser console: `ReferenceError: imageSize is not defined` on `/generate`
- Playwright chromium-auth tests: 25 failures all pointing to same root cause
