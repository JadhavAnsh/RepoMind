# RepoMind: Organizational Memory Engine

> **An intelligent, source-grounded knowledge assistant for code repositories.**  
> RepoMind ingests source code, documentation, pull requests, issues, and architectural decisions, transforming them into a searchable, repository-aware knowledge system that explains not only **what** the code does, but **why** it was designed that way—backed by verifiable citations.

---

## Table of Contents

- [Overview](#overview)
- [Key Features](#key-features)
- [System Architecture](#system-architecture)
  - [High-Level Flow](#high-level-flow)
  - [Core Components](#core-components)
  - [Technology Stack](#technology-stack)
- [Repository Structure](#repository-structure)
- [Current Implementation Status](#current-implementation-status)
  - [Current Baseline vs. Target Roadmap](#current-baseline-vs-target-roadmap)
  - [API Endpoints Overview](#api-endpoints-overview)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
  - [Environment Configuration](#environment-configuration)
  - [Running Locally](#running-locally)
- [Monorepo Scripts](#monorepo-scripts)
- [API Design & Conventions](#api-design--conventions)
  - [Response Envelopes](#response-envelopes)
  - [Error Handling](#error-handling)
  - [Standard Headers](#standard-headers)
  - [OpenAPI / Swagger Specs](#openapi--swagger-specs)
- [Security, Privacy & Grounding](#security-privacy--grounding)
- [Evaluation & Quality Metrics](#evaluation--quality-metrics)
- [Documentation Index](#documentation-index)
- [License](#license)

---

## Overview

Modern software engineering knowledge is fragmented across repositories, README files, commit logs, pull request discussions, issues, and design records. Standard search fails to capture semantic meaning across components, while generic AI coding assistants often hallucinate, use stale context, or fail to substantiate answers with actual code locations.

**RepoMind** solves this by:
1. Connecting securely to GitHub repositories under minimal required permissions.
2. Ingesting and indexing source code and engineering documentation with commit-level provenance.
3. Conducting hybrid (keyword + vector) retrieval with language-aware chunking.
4. Answering engineering questions with strict factual grounding and line-range citations.
5. Tracking dependencies and change impact across symbols, tests, and configuration.
6. Synchronizing incrementally on Git commits and webhooks without rebuilding the entire index.

---

## Key Features

- **Source-Grounded Answers:** Every claim links directly to supporting files, exact line ranges, and the indexed commit SHA.
- **Explicit Insufficient Evidence Detection:** If the repository does not contain enough evidence, the system abstains or asks for clarification rather than fabricating answers.
- **Change Impact & Dependency Mapping:** Identifies direct references, interface implementations, configuration linkages, and affected test suites for target symbols.
- **Incremental Synchronization:** Processes changed, renamed, added, and deleted files on Git push webhooks or manual triggers, keeping indexes fresh while invalidating stale embeddings.
- **Strict Tenant & Workspace Isolation:** All document chunks, embeddings, and query sessions are scoped to tenant organizations and workspaces.
- **Prompt Injection Hardening:** Repository content is treated strictly as untrusted evidence, preventing repository files or comments from overriding system instructions.

---

## System Architecture

### High-Level Flow

```mermaid
flowchart TD
    U["Developer / Browser"] --> WEB["Next.js Web App (apps/web)"]
    WEB --> API["NestJS API (apps/api)"]
    API --> AUTH["Authentication & Session Guard"]
    API --> GH["GitHub App / Octokit API"]
    API --> DB[("PostgreSQL + pgvector")]
    API --> Q["Background Job Queue"]
    Q --> ING["Python Ingestion & Retrieval Worker (services/retrieval)"]
    ING --> GH
    ING --> PARSE["Parsers & Language Chunking"]
    PARSE --> EMB["Embedding Provider (Vectorization)"]
    EMB --> DB
    API --> RET["Hybrid Retrieval Engine"]
    RET --> DB
    RET --> RERANK["Reranker (Optional)"]
    RERANK --> LLM["LLM Provider (Grounded Synthesis)"]
    LLM --> VALIDATE["Citation & Commit Validator"]
    VALIDATE --> API
    GH -->|"Signed Webhooks (HMAC SHA-256)"| API
```

### Core Components

1. **Web Application (`apps/web`):**
   - Built with Next.js (App Router), React, and Tailwind CSS.
   - Provides workspace management, repository connection flows, indexing progress dashboards, conversational question-answering interfaces, interactive citation inspection, and dependency visualization.
2. **Backend API (`apps/api`):**
   - Built with NestJS, TypeScript, and Express.
   - Orchestrates workspace membership, GitHub authorization, signed webhook verification, sync job creation, rate-limiting, audit logging, and query dispatching.
3. **Ingestion & Retrieval Service (`services/retrieval`):**
   - Built with Python and modular retrieval frameworks (e.g., LlamaIndex).
   - Responsible for AST-aware code chunking, metadata enrichment, embedding generation, hybrid search candidate generation, and static code relationship extraction.
4. **Primary Database & Vector Store (`infra/docker`):**
   - PostgreSQL 16+ serving as the relational system of record for organizations, workspaces, repositories, sync jobs, symbols, and citations.
   - `pgvector` extension for storing dense embedding vectors and performing cosine/inner-product similarity search.

### Technology Stack

| Layer | Technologies | Responsibilities |
|---|---|---|
| **Monorepo Engine** | [pnpm](https://pnpm.io/) (v10+ workspaces) | Monorepo dependency management, workspace filtering |
| **Frontend** | [Next.js](https://nextjs.org/) (v16), [React](https://react.dev/) (v19), [Tailwind CSS](https://tailwindcss.com/) (v4), shadcn/ui | UI dashboard, chat interface, citation inspector, theme support |
| **Backend API** | [NestJS](https://nestjs.com/) (v11), Express, [Swagger/OpenAPI](https://swagger.io/) | REST API, authentication guards, interceptors, error filters, webhook handlers |
| **Retrieval Worker** | Python 3.11+, [LlamaIndex](https://www.llamaindex.ai/) *(Target)* | Language-aware AST parsing, chunking, embeddings, vector search |
| **Data Storage** | PostgreSQL 16+, [pgvector](https://github.com/pgvector/pgvector) | Relational tenant schemas, source document metadata, embeddings |
| **Code Quality** | TypeScript 5, ESLint 9, Prettier 3, Jest 30 | Strict typing, automated testing, code standardization |

---

## Repository Structure

```text
RepoMind/
├── apps/
│   ├── api/                           # NestJS backend application
│   │   ├── src/
│   │   │   ├── common/                # Reusable decorators, filters, guards, interceptors
│   │   │   │   ├── decorators/        # @Public(), @CurrentUser(), @Roles()
│   │   │   │   ├── filters/           # Global AllExceptionsFilter & AppError
│   │   │   │   ├── guards/            # AuthGuard, ApiKeyGuard, RolesGuard
│   │   │   │   ├── interceptors/      # ApiResponseInterceptor, LoggingInterceptor
│   │   │   │   ├── middlewares/       # CorrelationIdMiddleware (x-correlation-id)
│   │   │   │   └── utils/             # Pagination helpers
│   │   │   ├── config/                # Environment, CORS, and OpenAPI Swagger configuration
│   │   │   ├── modules/
│   │   │   │   ├── auth/              # Auth controller, service, and DTOs
│   │   │   │   └── health/            # Health, liveness, and readiness controllers
│   │   │   ├── app.controller.ts      # Root ping & welcome endpoints
│   │   │   ├── app.module.ts          # Core application module & global middleware registration
│   │   │   └── main.ts                # Application bootstrap, Swagger setup, global pipes
│   │   ├── test/                      # End-to-end Jest configuration and specs
│   │   ├── .env.example               # Backend environment variable template
│   │   ├── nest-cli.json              # NestJS CLI configuration
│   │   ├── package.json               # API package dependencies and scripts
│   │   └── tsconfig.json              # TypeScript compilation configuration
│   │
│   └── web/                           # Next.js web application
│       ├── app/                       # Next.js App Router (layout, page, styles)
│       ├── components/                # UI components (shadcn/ui Button, Card, ThemeProvider)
│       ├── lib/                       # Utility functions (cn class-merging helper)
│       ├── package.json               # Web package dependencies and scripts
│       └── tsconfig.json              # TypeScript compilation configuration
│
├── docs/                              # Architecture and design specifications
│   ├── Project-Context.md             # Foundational requirements, user journey & MVP scope
│   ├── architecture.md                # System components, ingestion/query pipelines & constraints
│   ├── api-design.md                  # Comprehensive 56-route API specification & envelopes
│   ├── database-design.md             # 26-entity PostgreSQL + pgvector schema specification
│   ├── data-and-privacy.md            # Zero-trust security model, secret scanning & isolation
│   └── evaluation.md                  # Precision, recall, citation verification & evaluation rubric
│
├── infra/
│   └── docker/                        # Local container orchestration (.gitkeep)
│
├── services/
│   └── retrieval/                     # Python ingestion and vector retrieval worker (.gitkeep)
│
├── package.json                       # Monorepo root scripts and packageManager definition
├── pnpm-lock.yaml                     # Pnpm lockfile
├── pnpm-workspace.yaml                # Workspace package definition
└── README.md                          # Repository overview and documentation
```

---

## Current Implementation Status

### Current Baseline vs. Target Roadmap

| Domain | Implemented Baseline | Target Specification |
|---|---|---|
| **Monorepo** | pnpm workspace (`apps/*`, `packages/*`), unified root scripts | Full multi-package setup including `@repomind/contracts` and shared configs |
| **Backend (`apps/api`)** | NestJS 11 scaffold, global error filter, response interceptor, correlation ID middleware, CORS, Swagger OpenAPI UI, health & auth modules | Complete 43-route public API, persistent JWT auth, GitHub OAuth, workspace tenancy, sync orchestration |
| **Frontend (`apps/web`)** | Next.js 16, React 19, Tailwind CSS v4, dark mode theme provider, initial component library | Workspace selector, repo connection modal, indexing progress bar, query/chat interface, citation viewer |
| **Worker (`services/retrieval`)** | Architecture defined in `docs/` | Python FastAPI/Celery worker with AST code chunkers, LlamaIndex, pgvector embeddings |
| **Database** | Connection string configuration & readiness probe | 26 relational tables (UUID PKs, UTC timestamps, `citext`, `pgvector` embedding indexes) |

### API Endpoints Overview

#### Currently Implemented Endpoints (`apps/api`)

| Method & Route | Auth Scope | Description |
|---|---|---|
| `GET /` | Public | Service metadata, status, and OpenAPI documentation link |
| `GET /hello` | Public | Welcome greeting |
| `GET /api/v1/ping` | Public | Lightweight ping check (`{ ok: true }`) |
| `GET /api/v1/health` | Public | Liveness check reporting uptime and timestamp |
| `GET /api/v1/ready` | Public | Readiness check verifying database and worker connectivity |
| `POST /api/v1/auth/register` | Public | User registration endpoint |
| `POST /api/v1/auth/login` | Public | User login endpoint returning access token |
| `GET /api/v1/auth/me` | Bearer Token | Current user profile details |

*For the complete 56-route API design (including Workspaces, Repository Sync, Webhooks, Retrieval Queries, and Impact Analysis), refer to [docs/api-design.md](docs/api-design.md).*

---

## Getting Started

### Prerequisites

- **Node.js**: `v20.x` or higher (LTS recommended)
- **pnpm**: `v10.x` or higher (enforced via `packageManager` field)
- **Git**: Installed and configured
- **PostgreSQL**: `v16+` with `pgvector` (for complete database features)

### Installation

Clone the repository and install dependencies across all workspaces:

```bash
git clone https://github.com/aditeejadhav06/RepoMind.git
cd RepoMind

# Install workspace dependencies
pnpm install
```

### Environment Configuration

Configure environment variables for the API:

```bash
cp apps/api/.env.example apps/api/.env
```

Review and adjust variables in `apps/api/.env`:

```env
PORT=8000
NODE_ENV=development

# Database (PostgreSQL + pgvector)
DATABASE_URL=postgresql://user:password@localhost:5432/repomind

# GitHub App Integration
GITHUB_APP_ID=
GITHUB_APP_PRIVATE_KEY=
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=
GITHUB_WEBHOOK_SECRET=
```

### Running Locally

You can run individual services or both in parallel:

```bash
# Start the NestJS API server (runs on http://localhost:8000 or http://localhost:3001)
pnpm run dev:api

# Start the Next.js Web frontend (runs on http://localhost:3000)
pnpm run dev:web
```

Once running:
- **Web App:** [http://localhost:3000](http://localhost:3000)
- **API Base:** [http://localhost:8000](http://localhost:8000)
- **Interactive Swagger Docs:** [http://localhost:8000/docs](http://localhost:8000/docs)
- **OpenAPI JSON Document:** [http://localhost:8000/docs/openapi.json](http://localhost:8000/docs/openapi.json)

---

## Monorepo Scripts

The root `package.json` provides scripts to manage all packages from the root:

| Command | Action |
|---|---|
| `pnpm run dev:api` | Starts the NestJS API in watch mode |
| `pnpm run dev:web` | Starts the Next.js development server |
| `pnpm run build:api` | Compiles the NestJS TypeScript application into `dist/` |
| `pnpm run build:web` | Builds the Next.js production bundle |
| `pnpm run lint:api` | Runs ESLint on `apps/api` |
| `pnpm run lint:web` | Runs ESLint on `apps/web` |
| `pnpm run typecheck:api` | Runs `tsc --noEmit` on `apps/api` |
| `pnpm run typecheck:web` | Runs `tsc --noEmit` on `apps/web` |
| `pnpm run test:api` | Runs Jest unit tests on `apps/api` |

---

## API Design & Conventions

### Response Envelopes

All standard successful responses are wrapped using the global `ApiResponseInterceptor`:

```json
{
  "success": true,
  "message": "Request successful",
  "data": { ... }
}
```

### Error Handling

Exceptions caught by `AllExceptionsFilter` return a consistent error contract:

```json
{
  "success": false,
  "message": "Validation failed",
  "error_code": "VALIDATION",
  "data": [
    "email must be an email"
  ],
  "timestamp": "2026-11-04T06:30:00.000Z"
}
```

Standard error codes include: `VALIDATION`, `UNAUTHORIZED`, `FORBIDDEN`, `NOT_FOUND`, `CONFLICT`, `RATE_LIMITED`, `UPSTREAM_ERROR`, `STALE_INDEX`, and `INTERNAL_ERROR`.

### Standard Headers

- `Authorization: Bearer <token>`: User authentication.
- `x-correlation-id`: Distributed trace identifier (generated automatically if omitted).
- `x-tenant-id`: Target workspace ID for defense-in-depth isolation checks.

### OpenAPI / Swagger Specs

Interactive documentation is served at `/docs` using `@nestjs/swagger`. It includes tags for `App`, `Health`, and `Auth`, with Bearer Token and API Key authorization definitions.

---

## Security, Privacy & Grounding

RepoMind is designed around zero-trust handling of repository content:

1. **Least-Privilege GitHub Access:** Repositories are accessed via explicit GitHub App authorization grants scoped to selected repositories.
2. **Untrusted Content Demarcation:** All repository code, commit messages, issues, and PR comments are treated as untrusted data. Context windows explicitly delimit repository content from system instructions to prevent prompt-injection exploits.
3. **Secret Redaction:** Code is checked against secret patterns (API keys, private keys, tokens) during chunking. Detected secrets are excluded from embeddings and LLM prompts.
4. **No Arbitrary Execution:** Ingestion parses code through static AST analysis; repository code is never executed during indexing or retrieval.
5. **Traceable Citations:** All answers must cite specific document IDs, line ranges, and commit SHAs validated against current repository index state.

*For full privacy policies and threat modeling, see [docs/data-and-privacy.md](docs/data-and-privacy.md).*

---

## Evaluation & Quality Metrics

To ensure retrieval quality and eliminate hallucinations, the system is evaluated against curated question-evidence benchmarks:

- **Recall@k & MRR / nDCG:** Measuring the retrieval quality of relevant chunks.
- **Citation Precision & Coverage:** Verifying that each claim is supported by genuine, resolving citations.
- **Unsupported Claim Rate:** Strict tracking to drive hallucinated or ungrounded claims to zero.
- **Insufficient Evidence Accuracy:** Ensuring the model abstains or seeks clarification when information is missing.
- **Tenant Isolation:** Rigorous zero-tolerance test suites to prevent cross-workspace or cross-repository data leakage.

*For evaluation benchmarks and rubrics, see [docs/evaluation.md](docs/evaluation.md).*

---

## Documentation Index

Detailed architectural and design specifications are maintained in the [`docs/`](docs/) directory:

- [**docs/Project-Context.md**](docs/Project-Context.md): High-level product summary, user journeys, MVP scope, and assistant operating mandates.
- [**docs/architecture.md**](docs/architecture.md): Deep-dive into system components, data pipelines, incremental sync workflows, and architectural decisions.
- [**docs/api-design.md**](docs/api-design.md): Complete REST & internal API inventory (56 routes), contracts, and pagination standards.
- [**docs/database-design.md**](docs/database-design.md): Full PostgreSQL schema design covering all 26 entities, relations, and pgvector embeddings.
- [**docs/data-and-privacy.md**](docs/data-and-privacy.md): Security posture, prompt injection mitigation, secret scanning, and compliance requirements.
- [**docs/evaluation.md**](docs/evaluation.md): Quantitative metrics, edge cases, regression gates, and human review rubrics.

---

## License

This project is licensed under the terms defined in the repository. Please refer to individual package manifests for specific third-party licenses.
