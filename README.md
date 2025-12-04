# Tg React App

[![Build and Test](https://github.com/YOUR_USERNAME/tg.react.app/actions/workflows/build-and-test.yml/badge.svg)](https://github.com/YOUR_USERNAME/tg.react.app/actions/workflows/build-and-test.yml)

Modern .NET 9 + React reference that keeps a simple delivery checklist in sync between a backend API and a Vite powered SPA.

## Projects

- `src/Server/TgReactApp.Api` &mdash; ASP.NET Core minimal API that exposes CRUD-style endpoints under `/api/todos` plus a `/api/health` probe.
- `src/Web/tg-react-app.web` &mdash; React 18 + Vite front-end that consumes the API, lets you add items, toggle completion, and delete entries.

## Getting started

### Prerequisites

- [.NET 9 SDK](https://dotnet.microsoft.com/en-us/download/dotnet/9.0)
- [Node.js 18+](https://nodejs.org/) (needed for `npm install` inside the React project)

### Run the API

```powershell
cd src/Server/TgReactApp.Api
dotnet run
```

The API listens on `https://localhost:7062` and `http://localhost:5171` by default (see `launchSettings.json`). Open `https://localhost:7062/api/openapi.json` to inspect the OpenAPI contract.

### Run the React SPA

```powershell
cd src/Web/tg-react-app.web
npm install
npm run dev
```

The Vite dev server boots on `http://localhost:5173` and proxies `/api/*` calls to the API, so keep both processes running.

### Build for production

```powershell
cd src/Web/tg-react-app.web
npm run build
```

Static assets are emitted to `dist/`; they can be hosted behind any static file server or copied into a separate ASP.NET Core web host if needed.

## API reference

- `GET /api/todos` &mdash; returns every item (seeded with three sample records).
- `POST /api/todos` &mdash; create a new item. Payload: `{ "title": "string", "description": "string?" }`
- `PUT /api/todos/{id}` &mdash; update the title/description/completion flag.
- `DELETE /api/todos/{id}` &mdash; remove an item.
- `GET /api/health` &mdash; simple status check.

The in-memory repository keeps things lightweight for local demos but can be swapped with a persistent store by re-implementing `ITodoRepository`.

## CI/CD Pipeline

This project includes automated GitHub Actions workflows for continuous integration and deployment:

### 🔨 Automated Builds
- **Build and Test** - Runs on every push and pull request
  - Builds both backend (.NET 9) and frontend (React + Vite)
  - Runs tests and linting
  - Creates build artifacts

### ✅ Pull Request Validation
- **PR Validation** - Comprehensive checks on pull requests
  - Code quality analysis
  - Security vulnerability scanning
  - Bundle size monitoring
  - Automated PR summary comments

### 🚀 Deployment
- **Deploy Workflow** - Manual or release-triggered deployment
  - Creates production-ready packages
  - Supports multiple environments (staging/production)
  - Ready to integrate with Azure, AWS, or your hosting provider

📚 **[View Complete CI/CD Guide](.github/WORKFLOWS_GUIDE.md)** for setup instructions and customization options.

