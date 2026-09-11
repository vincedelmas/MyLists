# Changelog

## [3.6.0](https://github.com/vincedelmas/MyLists/compare/v3.5.2...v3.6.0) (2026-09-11)


### Features

* **tv:** add season ratings and rewatches ([b0120d7](https://github.com/vincedelmas/MyLists/commit/b0120d77a0c18710daed74f87878b9ad3a96f01b))


### Bug Fixes

* **accounts:** renew deletion grace period after warning retries ([578f31f](https://github.com/vincedelmas/MyLists/commit/578f31fa3fafa6577fcbe8f7a7e2af72c64ebc94))
* **accounts:** update collection like counts when deleting users ([ea704a4](https://github.com/vincedelmas/MyLists/commit/ea704a496ad4b2fbd8c35210cf8bb4146320333c))
* **activity:** apply title search before pagination ([c1359af](https://github.com/vincedelmas/MyLists/commit/c1359af3d47502855b50dd7b9f1d6bbed69d3824))
* **activity:** refresh cached totals after adding media ([45fc1dd](https://github.com/vincedelmas/MyLists/commit/45fc1dd93391226a8e199a623dcf1159ce4a9617))
* **auth:** download OAuth avatars before storing them ([80350e8](https://github.com/vincedelmas/MyLists/commit/80350e8ab93d47b722188e0a23d5bd3af23228a1))
* **auth:** validate usernames on user updates ([f2a0fdd](https://github.com/vincedelmas/MyLists/commit/f2a0fddc1858e96477d2467fc251d7d0b52b4f36))
* **collections:** reject nonexistent media IDs ([57c2ecd](https://github.com/vincedelmas/MyLists/commit/57c2ecd28f60cc82b25cdd5aaba15dc6158a8ee7))
* **docker:** launch compiled server entry point ([9d73c6e](https://github.com/vincedelmas/MyLists/commit/9d73c6eacaf9c62c263f72ec11196ac321dd2b93))
* **feed:** update profile feed locally after deletion ([1cd219e](https://github.com/vincedelmas/MyLists/commit/1cd219e421864e81d632afc1b51a0335772a08d8))
* **games:** preserve completion times during bulk refresh ([752dfaf](https://github.com/vincedelmas/MyLists/commit/752dfaf11a8aa9a1855b60f1996c8c888f1069b9))
* **images:** preserve newly saved images during cleanup ([54dad61](https://github.com/vincedelmas/MyLists/commit/54dad61a50089932fde3f8a3bddee0063f6647e0))
* **imports:** prefer provider IDs when matching media ([87807a7](https://github.com/vincedelmas/MyLists/commit/87807a78138d133fb5911e249ce58ee25e67803f))
* **lists:** prevent duplicate view counts ([12ff004](https://github.com/vincedelmas/MyLists/commit/12ff00424c28fb42e56787496824da1f1566191a))
* **lists:** refresh filter options after adding or removing media ([8587117](https://github.com/vincedelmas/MyLists/commit/858711769aa736c5df510c8298e8524338349b1c))
* **maintenance:** preserve active Moviedle movies during cleanup ([5b6e10d](https://github.com/vincedelmas/MyLists/commit/5b6e10d6e7e68e4ae2407ca772daffed2d8f8047))
* **media:** enforce unlocked defaults for automatic refresh ([dfbbe74](https://github.com/vincedelmas/MyLists/commit/dfbbe749cf1f7ebc201c816d1e57a8b1b0bbe54c))
* **media:** preserve existing covers when downloads fail ([c3fd6ac](https://github.com/vincedelmas/MyLists/commit/c3fd6acd6f67ada468599b705388f1e3720fa377))
* **media:** preserve reread totals on completion ([20c0d26](https://github.com/vincedelmas/MyLists/commit/20c0d265704f1a1661eeea848d4cab0fd6b908f8))
* **moviedle:** exclude the 200 most recent films ([d631ba2](https://github.com/vincedelmas/MyLists/commit/d631ba28c019b1be923ff05d1720a84fbaddddfc))
* **movies:** use fallback duration for zero TMDB runtimes ([610e1f3](https://github.com/vincedelmas/MyLists/commit/610e1f393b6ff0ffe556cdad8ab9026cf6c73bce))
* **notifications:** detect finales using the airing season ([76e6b15](https://github.com/vincedelmas/MyLists/commit/76e6b1561c00e0262ea0244ed7271e1086c66c41))
* **notifications:** display all social notifications ([cdab840](https://github.com/vincedelmas/MyLists/commit/cdab84030891589d0f570fa1a6000da0b3b196dd))
* **notifications:** resolve follow requests when dismissed ([79aedfc](https://github.com/vincedelmas/MyLists/commit/79aedfc359ae607ed40e040c3aed12ffa7057e95))
* **reading:** preserve partial progress when editing rereads ([5d3837e](https://github.com/vincedelmas/MyLists/commit/5d3837ebda5ded459a2c5a2ce7b52f675a27bbb3))
* **server:** correct static caching and drain requests on shutdown ([37fc7b9](https://github.com/vincedelmas/MyLists/commit/37fc7b9a8248b97c32760234d66e71f65364d167))
* **stats:** repair movie time on underflow ([f0f8642](https://github.com/vincedelmas/MyLists/commit/f0f86429e88669347180a698563bcfbccee30af5))
* strip sensitive query params from API error logs ([651525f](https://github.com/vincedelmas/MyLists/commit/651525fa1cc3e94da276b0bde1abd4ff1643c0e4))
* **tags:** refresh list filters after tag changes ([6b062f8](https://github.com/vincedelmas/MyLists/commit/6b062f8aab461b8c1f1c29f828eff13e136144fa))
* **tasks:** propagate failures after saving task results ([fb5cd2e](https://github.com/vincedelmas/MyLists/commit/fb5cd2e2b9917a8690b4009f6ff06bdbf8e15dae))
* **tv:** count first episode when starting a planned show ([637f422](https://github.com/vincedelmas/MyLists/commit/637f4220edf75aa0044fe3e0511c2ed8b738e980))


### Code Refactoring

* **media:** extract media queries from base repository ([99906fa](https://github.com/vincedelmas/MyLists/commit/99906fa465b76aa81d99f79b38ab9f785f66c809))
* **media:** replace repository and service inheritance with composition ([24cf07f](https://github.com/vincedelmas/MyLists/commit/24cf07f334daf4ca1c97d4eb4b68daaf742601d4))

## [3.5.2](https://github.com/vincedelmas/MyLists/compare/v3.5.1...v3.5.2) (2026-09-07)


### Bug Fixes

* init admin rate limiter lazily to prevent build hangs ([bab6fcc](https://github.com/vincedelmas/MyLists/commit/bab6fccfec4ab76363809f93a4b4cf104ee18534))

## [3.5.1](https://github.com/vincedelmas/MyLists/compare/v3.5.0...v3.5.1) (2026-09-07)


### Bug Fixes

* **cache:** periodically remove expired in-memory entries ([20c5703](https://github.com/vincedelmas/MyLists/commit/20c57031987ee2924cce9eed8044208e1401ee3e))
* **database:** atomic transactions and better write contention ([b7aab5a](https://github.com/vincedelmas/MyLists/commit/b7aab5afd3367d43503fd7a9e1d0eeb4793b3c06))
* **docker:** align deployment config and doc ([3f88211](https://github.com/vincedelmas/MyLists/commit/3f88211f0eb7e2366c7c7e444e7be03834375fcd))
* refresh media lists after editing ends ([fe906fe](https://github.com/vincedelmas/MyLists/commit/fe906fe0ec36278cd24bdc49a12f4fefe7a34fdd))
* **security:** prevent SSRF in cover image downloads ([7f03866](https://github.com/vincedelmas/MyLists/commit/7f03866c2db40dc0428fc1714e14200c02d6380d))
* track Bun lockfile for reproducible deployments ([cbde185](https://github.com/vincedelmas/MyLists/commit/cbde185b767306daddb1b25008076976f3df373d))


### Code Refactoring

* **auth:** refactor auth flow ([ba1154a](https://github.com/vincedelmas/MyLists/commit/ba1154ab8cf4d23138cd62c077f0367bb1953975))
* **ui:** simplify statistics card labels ([59b06c9](https://github.com/vincedelmas/MyLists/commit/59b06c98dd35141b0604d929b35a9ad4b6ba26c8))
* **utils:** replace clsx and tailwind-merge with cn ([d72ad45](https://github.com/vincedelmas/MyLists/commit/d72ad451174ecb18b4f1792eea3e83f0dbfd729f))

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
