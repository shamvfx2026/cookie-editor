# PulseBrief - Production SPA News Website

A lightweight single-page news application using **Node.js + Express + SQLite + node-cron**.

## Features
- SPA frontend with Tailwind CSS styling
- Backend cron sync every 8 hours (`0 */8 * * *`)
- News fetched from NewsAPI and stored locally in SQLite
- Frontend reads only backend local cache (`/api/news`)
- Category filter + search + pagination (load more)
- Skeleton loading UI and light/dark mode
- Gzip compression, basic security headers, and cache-control

## Project Structure

```
/project-root
  /server
    server.js
    /routes
    /controllers
    /services
    /cron
    /database
  /client
    index.html
    app.js
    styles.css
  .env.example
  package.json
  NEWS-SPA-README.md
  DEPLOYMENT.md
```

## Quick Start

1. Install dependencies:
   ```bash
   npm install
   ```
2. Configure environment:
   ```bash
   cp .env.example .env
   ```
   Update `NEWS_API_KEY`.
3. Start app:
   ```bash
   npm start
   ```
4. Open:
   - App: `http://localhost:3000`
   - Health check: `http://localhost:3000/health`
   - News API: `http://localhost:3000/api/news`

## API Usage

- `GET /api/news`
- `GET /api/news?category=technology`
- `GET /api/news?search=ai&page=1&pageSize=12`

## Notes
- Initial sync runs once at startup.
- Scheduled sync runs every 8 hours.
- Deduplication is handled by SQLite unique constraint (`title + source + published_at`).
