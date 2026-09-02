# Changelog

## [3.5.0](https://github.com/vincedelmas/MyLists/compare/v3.4.0...v3.5.0) (2026-09-02)


### Features

* **navigation:** make primary tabs link-backed ([90ace54](https://github.com/vincedelmas/MyLists/commit/90ace54f669cf4041e0b5b0c8eeaa163b155a46f))
* **ui:** redesign headers and pages ([799f667](https://github.com/vincedelmas/MyLists/commit/799f6675a86aa0ef02a67a79fe6daa56a91fdcf0))


### Bug Fixes

* **activity:** hide media type labels in yearly view ([549eb41](https://github.com/vincedelmas/MyLists/commit/549eb412454dbfceaa49f29d6c6ea0e6f6e5b0c8))
* **mal:** handle &gt; 64 char anime genre searches ([9d4bc2e](https://github.com/vincedelmas/MyLists/commit/9d4bc2ece7a9d5902305da3d5996df4e2e48768d))
* **ui:** revamp 404 / Unexpected Error page to full-width ([7b766bb](https://github.com/vincedelmas/MyLists/commit/7b766bbe845c35a135626808727af937aa022fd3))


### Code Refactoring

* **theme:** consolidate color tokens and palettes ([9625bf2](https://github.com/vincedelmas/MyLists/commit/9625bf28e9ea57455cfcbf25691ffcc1c868d5d3))

## [3.4.0](https://github.com/vincedelmas/MyLists/compare/v3.3.1...v3.4.0) (2026-08-29)


### Features

* add Mediadle leaderboard and refresh game layout ([fcba4c8](https://github.com/vincedelmas/MyLists/commit/fcba4c8486f4a2a18edfcb8d63e66661b885af35))
* revamp Which Came First game ([3b9ace7](https://github.com/vincedelmas/MyLists/commit/3b9ace76ef02e103055184f615b01dadfcce4e2c))


### Bug Fixes

* **auth:** legacy password hashes blob -&gt; str ([0ada097](https://github.com/vincedelmas/MyLists/commit/0ada0973130f30b55e261582ed14e6975a743d1b))

## [3.3.1](https://github.com/vincedelmas/MyLists/compare/v3.3.0...v3.3.1) (2026-08-27)


### Bug Fixes

* **app:** prevent browser APIs during SPA shell rendering ([b5ef693](https://github.com/vincedelmas/MyLists/commit/b5ef6932478112f7aa00e19bfdf8de317ce0e663))

## [3.3.0](https://github.com/vincedelmas/MyLists/compare/v3.2.0...v3.3.0) (2026-08-27)


### Features

* **auth:** upgrade Better Auth to 1.7.2 ([2ff7b88](https://github.com/vincedelmas/MyLists/commit/2ff7b8827e531131eecffbd89b4ec83963bfe265))


### Bug Fixes

* **activity:** correct yearly activity tracking ([c047596](https://github.com/vincedelmas/MyLists/commit/c04759610cd58b07948b23cf29f8b777c25f6b78))
* **hltb:** discover dynamic search endpoint ([fa3d638](https://github.com/vincedelmas/MyLists/commit/fa3d638b3d9209cd0b7fa20a4ee1c09f46b790c3))
* **media:** set deleted comments to null ([40d4717](https://github.com/vincedelmas/MyLists/commit/40d4717f498a1697452669057e817a3aeb25ad0c))
* **search:** prevent invalid book filter requests ([dd0b66a](https://github.com/vincedelmas/MyLists/commit/dd0b66a01f0de8e9de5dacdebcbb0a8db2ce34b1))


### Code Refactoring

* better date formatting and add title to stats ([e7bdc47](https://github.com/vincedelmas/MyLists/commit/e7bdc47385e41dfb6b1d80afc1e45e7865cd45e8))
* centralize query options in route context ([0d523d1](https://github.com/vincedelmas/MyLists/commit/0d523d12957744af20d3af7cf9660e7b6e803dcb))
* **react:** remove compiler-redundant memo ([d7f83cd](https://github.com/vincedelmas/MyLists/commit/d7f83cdeef600b76d4ea067843aaa479eb45fbf0))
* **table:** migrate to TanStack Table v9 ([122b63b](https://github.com/vincedelmas/MyLists/commit/122b63b3c96fc68bf5a0777adb5a54629b0b0ecb))

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
