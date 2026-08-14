# Changelog

## [3.1.0](https://github.com/vincedelmas/MyLists/compare/v3.0.0...v3.1.0) (2026-08-14)


### Features

* auto update completed status to on hold for tv ([d0bc9d1](https://github.com/vincedelmas/MyLists/commit/d0bc9d1c9b0ca94ab5e0fd7045155b4522479556))
* source trending games from IGDB PopScore ([32c1c92](https://github.com/vincedelmas/MyLists/commit/32c1c92862b45c13871392db6eb23a0bc4815f45))


### Bug Fixes

* add max-height and vertical overflow for collection items ([75864f9](https://github.com/vincedelmas/MyLists/commit/75864f90dab9ff4d9d6924b9c9098712bd9167f5))
* quick add button shape ([34f2d38](https://github.com/vincedelmas/MyLists/commit/34f2d388e940168b785395ccbf971de1e2315aae))


### Performance Improvements

* migrate from Recharts to TanStack Charts ([94d409f](https://github.com/vincedelmas/MyLists/commit/94d409fcec3838c780bd72920681943b4278b83f))
* replace PostHog with lite SDK ([7755c9e](https://github.com/vincedelmas/MyLists/commit/7755c9ef16d6aac43e94142872b0a0db1deaefd0))

## 3.0.0

### A new TypeScript foundation

MyLists 3.0 marks a complete technical rebuild of the app.

- MyLists is now a unified, full-stack TypeScript app.
- The former Python backend (flask) and JavaScript frontend have been replaced by an end-to-end type-safe codebase.
- Types now flow across the whole stack from the backend to the frontend.
- The app now runs on a modern Bun, TanStack Start, React, and Drizzle foundation.

Rather than noting every change made since the old v2.3.0, this release creates a clean new baseline for MyLists. Future versions and release notes will be managed using Release
Please (https://github.com/googleapis/release-please).
