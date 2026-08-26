# Repository Guidelines

- Utility functions live in `/src/lib/utils`.
- Do not build the project unless explicitly asked.
- Create tests only when they are necessary.
- Avoid creating functions that are used only once when possible. First look for an existing function that already works or can be lightly
  modified to support the use case.
- Do not use overly defensive programming. Add checks where necessary; otherwise, trust the types.
- Prefer the smallest change that fixes the root cause. Do not add fallback logic when an enforced data invariant is enough.
