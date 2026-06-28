# CYBER-DOME: Neon Automata AI Rules

This file outlines the workspace-scoped rules and behavior expected from Google Antigravity agents in this repository.

## 🏛️ System & Architecture
- **Go Backend & React Frontend**: The application uses a Go backend and a React/TypeScript frontend.
- **YAGNI Directive**: Do not write overly generic frameworks, wrappers, or interfaces. Favor concrete, simple code.
- **Thread Safety**: Make sure state modifications in the backend are guarded by `sync.Mutex` or `sync.RWMutex` as appropriate.
- **Rules Reference**: Always refer to the guidelines in [GEMINI.md](file:///home/yuma/projects/cyber-dome-neon-automata/GEMINI.md) for detailed programming conventions.

## 🤖 Workflow & Verification
- **Validate Before Completing**: Always run local tests and validation checks before concluding your turn or submitting code.
- **Verification Hook**: You can run `./.shared-agents/harness/verify.sh` to run all project tests, linters, and type checkers at once.
- **Verification Skill**: Use the `verify-code` workspace skill to run project validation.
