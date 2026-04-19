# Running Playwright Tests from Windows

## Prerequisites
1. Node.js 18+ installed on Windows
2. Open PowerShell in the project folder (use `\\wsl.localhost\Ubuntu-22.04\home\rony\dev\assessment\portal` OR clone to Windows)

## Setup
```powershell
# Install dependencies
npm install

# Install Playwright browsers
npx playwright install chromium

# Set environment variables
$env:BASE_URL = "https://kiros-quality-portal.vercel.app"
$env:TEST_EMAIL = "your-admin@email.com"
$env:TEST_PASSWORD = "your-password"

# Optional — set a pre-created candidate access token for questionnaire tests
$env:TEST_CANDIDATE_TOKEN = "abc123..."
```

## Run all tests
```powershell
npx playwright test
```

## Run specific test file
```powershell
npx playwright test tests/e2e/sidebar.spec.ts
```

## Run with UI (interactive mode)
```powershell
npx playwright test --ui
```

## View report
```powershell
npx playwright show-report
```

## Test files
- `auth.setup.ts` — Authentication setup (runs once, saves session)
- `sidebar.spec.ts` — Sidebar navigation
- `candidates.spec.ts` — Recruitment positions + invites
- `questionnaire.spec.ts` — Public /apply/[token] questionnaire
- `programming.spec.ts` — Programming hub
- `ai-config.spec.ts` — AI configuration admin
- `chat.spec.ts` — AI chat with agents
- `agents.spec.ts` — Admin agents page
- `regression.spec.ts` — Existing feature regression

## Notes

- Tests run sequentially (`workers: 1`) to avoid race conditions on shared state.
- Authentication runs once via `auth.setup.ts`; subsequent tests reuse the stored session at `playwright/.auth/user.json`.
- The questionnaire spec skips full-flow tests unless `TEST_CANDIDATE_TOKEN` (and optionally `RUN_FULL_QUESTIONNAIRE=1`) are set — a real candidate must be seeded first because the public page requires a valid token.
- HTML report is written to `playwright-report/`, JSON results to `test-results.json`.
