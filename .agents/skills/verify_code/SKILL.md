---
name: verify-code
description: Run all tests, lints, and type checks for the cyber-dome-neon-automata Go backend and React frontend.
---

# verify-code Skill

Use this skill to run verification checks on the codebase (Go tests, React tests, ESLint, and TypeScript compilation).

## Instructions

1. Execute the verification script:
   Run the command `./.shared-agents/harness/verify.sh` from the root of the workspace.
2. Analyze the output:
   - If the checks pass successfully, proceed with your work.
   - If the checks fail, locate the specific Go test failure, ESLint warning, or TypeScript compilation error, fix the files, and run the command again.
   - Limit self-correction to 3 attempts. If errors persist, report the errors clearly.
