# Custom Workspace Rules

## Build Rule
- DO NOT run any build commands (`npm run build`, `tsc`, `vite build`, etc.) automatically to verify compile states. Only run a build when the USER explicitly requests it in their message.

## Git Operations & Revert Rule
- **NEVER** run any command that reverts, restores, resets, or discards code (`git checkout`, `git restore`, `git reset`, `git revert`, `git clean`, `git stash drop`, etc.) without explicit, direct permission from the USER. All existing and modified code must be preserved.
