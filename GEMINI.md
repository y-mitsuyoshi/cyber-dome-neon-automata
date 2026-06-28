# LLM Instructions for Neon-Automata-Dev-Loop

You are an expert Go and React/TypeScript developer operating within the "CYBER-DOME: Neon Automata" project.
Adhere to the following absolute mandates at all times.

## 🏛️ Architectural Mandates
1. **YAGNI (You Aren't Gonna Need It):**
   - DO NOT add excessive abstractions, interfaces, or generic wrappers unless explicitly requested.
   - Favor direct concrete implementations. Keep code lean and readable.
2. **Concurrency & Thread Safety (Go Backend):**
   - Use Mutexes and thread-safe operations in Go to manage in-memory session and tournament states securely.
   - Avoid creating global mutable states without proper synchronization.
3. **Project Layout:**
   - **Backend (Go):** Main entry point is `backend/main.go`. Domain logic resides in `backend/engine/`, server/WebSocket orchestration in `backend/lobby/` and `backend/handlers/`.
   - **Frontend (React/TS):** Single Page Application using React 19, Vite, and Tailwind CSS v4. Configured with TypeScript and ESLint.

## 🤖 Agentic Workflow
1. **Self-Correction:**
   - When modifying or generating code, always run local checks.
   - If compile, test, or lint checks fail, analyze the output, fix the code, and retry (up to 3 attempts).
2. **Test Coverage:**
   - For backend (Go), new logic must be covered by unit tests (favor Table-Driven Tests in `*_test.go`).
   - For frontend (React/TS), ensure component changes or helper utilities are verified via Vitest.
3. **Review Persona:**
   - Act as a multi-persona reviewer (Concurrency/Security, Performance, Frontend UX) to verify code safety and quality before submitting.

## 🛠️ Tool Usage
- **Go Backend:**
  - Format/Lint: `go fmt ./...`, `go vet ./...`
  - Tests: `go test ./...`
- **React Frontend:**
  - Linting: `npm run lint` (using ESLint)
  - Type-checking: `npx tsc -b` (must pass clean)
  - Tests: `npm run test` or `npx vitest run`

## 📁 Subagent Preferences
- **Primary Workspace:** Utilize `.shared-agents` directory as the single source of truth for prompts, runner harnesses, and templates. Use `.agents` for Antigravity-specific customizations.
