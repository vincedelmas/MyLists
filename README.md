# MyLists

[![Bun](https://img.shields.io/badge/Bun-v1.3.2-white?style=flat&logo=bun&logoColor=%23fbf0df)](https://bun.sh)
[![React](https://img.shields.io/badge/React-19.2-%2361DAFB?style=flat&logo=react&logoColor=black)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-%233178C6?style=flat&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![TanStack](https://img.shields.io/badge/TanStack-Start-%2306B6D4?style=flat&logo=tanstack&logoColor=white)](https://tanstack.com/)
[![Drizzle](https://img.shields.io/badge/Drizzle-ORM-%23C5F74F?style=flat&logoColor=black)](https://orm.drizzle.team/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4.1-%2338BDF8?style=flat&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)

**The all-in-one media tracking platform.**

MyLists is a comprehensive, type-safe web-app designed to help you organize and track your movies,
TV series, anime, manga, books, and video games in one unified interface.

### Key Features

- **Multi-Media lists**: Dedicated lists for Movies, Series, Anime, Manga, Books, and Games.
- **Upcoming Media**: Get notified when new Media are released.
- **Advanced Analytics**: Visualize your habits with detailed statistics, trends, and platform-wide insights.
- **Modern Full-Stack Architecture**: Built with TanStack Start and end-to-end type-safety.
- **Daily Moviedle**: A daily guessing game to test your movie knowledge.
- **Achievements System**: Earn unique badges and track your progress as you consume more media.
- **Secure Authentication**: Robust user management powered by Better-Auth.

### Quick Start

Ensure you have [Bun](https://bun.sh) installed on your machine.

1. **Clone the repo**
   ```bash
   git clone https://github.com/crossoufire/mylists.git
   cd mylists
   ```

2. **Install deps**
   ```bash
   bun install
   ```

3. **Configure the env file**

   Create a `.env` file in the root directory (you can copy from `.env.example`):
   Update it with your credentials and configuration values.
   See [Environment Variables](#environment-variables) for more info.

   ```bash
   cp .env.example .env
   ```

4. **Initialize Database**
   Initialize a new SQLite database in the `instance` directory.
   ```bash
   bun run new:db
   ```

5. **Run the Dev Server**

   ```bash
   bun run dev
   ```
6. **Create a new user**
   You can create a new user with different roles (user, manager, admin) without email verification or OAuth2 setup using the CLI:
   ```bash
   bun run cli -- create-user \
     --email admin@example.com \
     --password "change-me-strong-password" \
     --username admin \
     --role admin
   ```

### Docker Deployment

Docker deployment is documented in [docs/docker-deployment.md](./docs/docker-deployment.md).

The Docker Compose setup builds the app image and starts Redis.
It mounts persistent storage for SQLite, images, and Redis data. Provide
cron/maintenance scheduling and public HTTPS from your deployment platform when needed.
PostHog is optional and disabled when its public key is empty.

---

### Environment Variables

Below is an explanation for each key found in `.env.example`:

| Variable                                    | Description                                                 | Required | Example                        |
|---------------------------------------------|-------------------------------------------------------------|----------|--------------------------------|
| **Main Configuration**                      |                                                             |          |                                |
| `DATABASE_URL`                              | SQLite / PostgreSQL / other DB connection URL               | ✅        | `file:./instance/site.db`      |
| `VITE_BASE_URL`                             | Base URL used by the frontend                               | ✅        | `http://localhost:3000`        |
| `VITE_CONTACT_MAIL`                         | Email used to be contacted by users                         | ❌        |                                |
| **File Management**                         |                                                             |          |                                |
| `UPLOADS_DIR_NAME`                          | Folder name where uploaded files are stored                 | ✅        | `static`                       |
| `BASE_UPLOADS_LOCATION`                     | Path to the uploads directory (relative or absolute)        | ✅        | `./public/static/`             |
| **Admin Access**                            |                                                             |          |                                |
| `ADMIN_PASSWORD`                            | Admin dashboard password                                    | ✅        | `password`                     |
| `ADMIN_TOKEN_SECRET`                        | Secret key for admin access token signing                   | ✅        |                                |
| `ADMIN_TTL_COOKIE_MIN`                      | Lifespan of the admin session cookie (in minutes)           | ❌        | `10`                           |
| **Admin Mail Service**                      |                                                             |          |                                |
| `ADMIN_MAIL_USERNAME`                       | SMTP username/email used to send verification emails        | ✅        |                                |
| `ADMIN_MAIL_PASSWORD`                       | SMTP password                                               | ✅        |                                |
| **Demo User**                               |                                                             |          |                                |
| `DEMO_PASSWORD`                             | Password for demo profile (if enabled)                      | ❌        |                                |
| **Cache / Redis**                           |                                                             |          |                                |
| `CACHE_TTL_MIN`                             | Cache duration (min)                                        | ❌        | `5`                            |
| `REDIS_ENABLED`                             | Enables Redis-backed cache, rate limits, and API monitoring | ❌        | `false`                        |
| `REDIS_URL`                                 | Redis connection string, required only if Redis is enabled  | ❌        | `redis://localhost:6379`       |
| **Authentication**                          |                                                             |          |                                |
| `BETTER_AUTH_SECRET`                        | Secret used by Better Auth for encryption                   | ✅        |                                |
| **OAuth2 Providers**                        |                                                             |          |                                |
| `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET` | GitHub OAuth2 credentials                                   | ❌        |                                |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Google OAuth2 credentials                                   | ❌        |                                |
| **API Keys**                                |                                                             |          |                                |
| `THEMOVIEDB_API_KEY`                        | API key for TMDB                                            | ✅        |                                |
| `GOOGLE_BOOKS_API_KEY`                      | API key for Google Books                                    | ❌        |                                |
| `IGDB_CLIENT_ID` / `IGDB_CLIENT_SECRET`     | IGDB OAuth credentials                                      | ✅        |                                |
| **LLM Integration (Optional)**              |                                                             |          |                                |
| `LLM_MODEL_ID`                              | Model ID (OpenRouter or local) used to generate book genres | ❌        | `google/gemini-2.5-flash-lite` |
| `LLM_BASE_URL`                              | Base URL for the chosen LLM API                             | ❌        | `https://openrouter.ai/api/v1` |
| `LLM_API_KEY`                               | API key or local access token for the LLM provider          | ❌        |                                |

---

### Redis Setup

Redis caching is optional.

- To run without Redis, set:
  ```bash
  REDIS_ENABLED=false
  ```
- To use Redis, ensure Redis is available and configured:
  ```bash
  REDIS_ENABLED=true
  REDIS_URL=redis://redis:6379
  ```

Redis is used for shared caching, shared rate limiting, and API monitoring rollups.
Without Redis, the app falls back to in-memory cache/rate limiting. The admin API monitoring page will not collect outbound API rollups without Redis.

---

### LLM Integration (Optional)

The LLM is **exclusively used to generate genre data for books** since Google Books does not provide genre metadata.
You can choose how this background task runs:

1. **Manually**, by executing it with the CLI
2. **Automatically**, using a scheduled cron job

---

### Contributing

Contributions are welcome!  
If you’d like to improve MyLists, fork the repo, create a feature branch, and open a pull request.

---

**Built with ❤️ using Bun, Drizzle, Better-Auth, React, TypeScript, and TanStack.**
