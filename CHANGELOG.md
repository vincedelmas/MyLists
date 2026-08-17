# Changelog

## [3.2.0](https://github.com/vincedelmas/MyLists/compare/v3.1.0...v3.2.0) (2026-08-17)


### Features

* **activity:** add full-year activity browsing and editing ([561383a](https://github.com/vincedelmas/MyLists/commit/561383ae11bd4f017aa37495e48eb139bc23f89b))
* **recap:** add configurable yearly cross-media recaps ([ef70c6f](https://github.com/vincedelmas/MyLists/commit/ef70c6f1599f25b80702ee7f6c8e298d0ab7f126))
* **recap:** add shareable 4:5 social cards ([91d32f9](https://github.com/vincedelmas/MyLists/commit/91d32f954c5d09adfaa3b723e3b28a3fc88f7609))
* **search:** redesign results with social and list context ([ae6e9dd](https://github.com/vincedelmas/MyLists/commit/ae6e9dd1cded032272bdd7919ace6a8e76fb3ffc))
* **stats:** redesign user and platform statistics dashboards ([2eca5e5](https://github.com/vincedelmas/MyLists/commit/2eca5e57ce7c415fae769f1a997488b5ef0d8d4c))


### Code Refactoring

* **media:** centralize statistics metadata and theme colors ([2802a6b](https://github.com/vincedelmas/MyLists/commit/2802a6be3cf249f772ccbc509b1aeb26d10662ec))
* **server:** split user concerns into focused domains ([9003eca](https://github.com/vincedelmas/MyLists/commit/9003eca8e2a0d2ae93bb3e564796ccf3121c0ddb))
* **ui:** consolidate info popovers ([1fc0d9e](https://github.com/vincedelmas/MyLists/commit/1fc0d9e0ab2ee28265edb0a1f77467370530095d))

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
