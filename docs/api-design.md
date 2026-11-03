# RepoMind API Design

## 1. Purpose and API inventory

This document is the API inventory and design baseline for RepoMind. It separates:

1. **NestJS public application APIs** used by the web application and GitHub.
2. **Python internal service APIs** used for ingestion, retrieval, and code analysis.

The repository currently contains only the NestJS application. Python services are planned by the architecture documents but do not yet have source files or implemented routes.

| Area | Implemented now | Target design | Boundary |
|---|---:|---:|---|
| NestJS public API | 8 routes | 43 routes | Browser, GitHub, administrators |
| Python internal APIs | 0 routes | 13 routes | NestJS/queue to Python worker |
| **Total** | **8 routes** | **56 routes** | |

The target count includes operational endpoints and excludes Swagger UI assets, the OpenAPI JSON document, database calls, queue messages, and third-party GitHub/LLM provider APIs.

## 2. Common API conventions

### 2.1 Base URLs

| Service       | Base URL                                    | Intended access        |
| ------------- | ------------------------------------------- | ---------------------- |
| NestJS        | `https://api.example.com`                   | Public application API |
| NestJS local  | `http://localhost:8000`                     | Local development      |
| Python worker | Private service URL, not browser-accessible | Internal only          |

NestJS uses URI versioning for normal controllers:

```text
/api/v1/<resource>
```

The root ping is version-neutral and remains at `/`.

### 2.2 Authentication and headers

Public NestJS requests should use:

```http
Authorization: Bearer <access-token>
x-correlation-id: <optional-request-id>
x-tenant-id: <workspace-id>
Content-Type: application/json
```

The `x-tenant-id` header is a defense-in-depth tenant hint. The workspace and repository in the URL remain authoritative and must be authorized for the current user.

Internal Python requests must use service authentication, preferably mTLS plus a short-lived service token. An internal API key may be used for local development only. Internal endpoints must never be exposed through the web application's public proxy.

### 2.3 Success and error envelopes

NestJS currently wraps successful responses with the global response interceptor:

```json
{
  "success": true,
  "message": "Request successful",
  "data": {}
}
```

NestJS errors use the global exception filter:

```json
{
  "success": false,
  "message": "Validation failed",
  "error_code": "VALIDATION",
  "data": [],
  "timestamp": "2026-11-03T00:00:00.000Z"
}
```

Expected common error codes are `VALIDATION`, `UNAUTHORIZED`, `FORBIDDEN`, `NOT_FOUND`, `CONFLICT`, `RATE_LIMITED`, `UPSTREAM_ERROR`, `STALE_INDEX`, and `INTERNAL_ERROR`.

### 2.4 Pagination

Collection endpoints use `page` and `limit` query parameters. The standard response data shape is:

```json
{
  "items": [],
  "total": 0,
  "page": 1,
  "limit": 20,
  "totalPages": 0
}
```

Recommended maximum `limit` is 100. Cursor pagination can be added for large event or search result collections without changing resource authorization.

## 3. NestJS public API

### 3.1 Implemented route inventory

These routes are present in `apps/api/src` today.

| # | Method and path | Auth | Purpose | Source |
|---:|---|---|---|---|
| 1 | `GET /` | Public | Base endpoint; returns API info & metadata | `app.controller.ts` |
| 2 | `GET /hello` | Public | Base welcome greeting | `app.controller.ts` |
| 3 | `GET /api/v1/ping` | Public | Health ping check | `modules/health/health.controller.ts` |
| 4 | `GET /api/v1/health` | Public | Liveness status and timestamp | `modules/health/health.controller.ts` |
| 5 | `GET /api/v1/ready` | Public | Readiness status; reports system readiness | `modules/health/health.controller.ts` |
| 6 | `POST /api/v1/auth/register` | Public | Register a user | `modules/auth/auth.controller.ts` |
| 7 | `POST /api/v1/auth/login` | Public | Log in with email and password | `modules/auth/auth.controller.ts` |
| 8 | `GET /api/v1/auth/me` | Bearer | Return the current user profile | `modules/auth/auth.controller.ts` |

The current auth guard only checks whether an authorization or `auth_token` header exists, and the login service returns a placeholder token. Production JWT validation and persistence are still required.

### 3.2 Target route inventory

The following 43 routes are the recommended public API surface. `Planned` means the route is part of this design and is not currently implemented.

#### A. Base endpoints and service operations — 5 routes

| Status | Method and path | Auth | Purpose |
|---|---|---|---|
| Implemented | `GET /` | Public | Base endpoint; service metadata & status |
| Implemented | `GET /hello` | Public | Welcome message |
| Implemented | `GET /api/v1/ping` | Public | Health ping check |
| Implemented | `GET /api/v1/health` | Public | Liveness check |
| Implemented | `GET /api/v1/ready` | Public | Dependency readiness check |

Readiness should check PostgreSQL, the queue, and the Python worker before returning `status: ready`.

#### B. Authentication and GitHub authorization — 7 routes

| Status | Method and path | Request | Response |
|---|---|---|---|
| Implemented | `POST /api/v1/auth/register` | `email`, `password`, `firstName`, optional `lastName` | User and account-created message |
| Implemented | `POST /api/v1/auth/login` | `email`, `password` | Access token and user |
| Implemented | `GET /api/v1/auth/me` | — | Current user |
| Planned | `POST /api/v1/auth/refresh` | Refresh token | Rotated access and refresh tokens |
| Planned | `POST /api/v1/auth/logout` | Refresh token or current session | Revoked session result |
| Planned | `GET /api/v1/auth/github` | Optional return URL | GitHub authorization redirect |
| Planned | `GET /api/v1/auth/github/callback` | OAuth `code`, `state` | Linked GitHub identity and session |

Passwords must never be returned. OAuth `state` must be single-use and bound to the initiating session.

#### C. Workspaces and membership — 9 routes

| Status | Method and path | Purpose |
|---|---|---|
| Planned | `GET /api/v1/workspaces` | List workspaces available to the user |
| Planned | `POST /api/v1/workspaces` | Create a workspace |
| Planned | `GET /api/v1/workspaces/{workspaceId}` | Get workspace metadata |
| Planned | `PATCH /api/v1/workspaces/{workspaceId}` | Update workspace name/settings |
| Planned | `DELETE /api/v1/workspaces/{workspaceId}` | Delete workspace and initiate data deletion |
| Planned | `GET /api/v1/workspaces/{workspaceId}/members` | List members and roles |
| Planned | `POST /api/v1/workspaces/{workspaceId}/members/invitations` | Invite a member |
| Planned | `PATCH /api/v1/workspaces/{workspaceId}/members/{memberId}` | Change member role or status |
| Planned | `DELETE /api/v1/workspaces/{workspaceId}/members/{memberId}` | Remove a member |

Roles should start with `owner`, `admin`, `member`, and `viewer`. Every route must enforce workspace membership and role requirements.

#### D. Repository connections and synchronization — 11 routes

| Status | Method and path | Purpose |
|---|---|---|
| Planned | `GET /api/v1/workspaces/{workspaceId}/repositories` | List connected repositories |
| Planned | `POST /api/v1/workspaces/{workspaceId}/repositories` | Connect an authorized GitHub repository |
| Planned | `GET /api/v1/workspaces/{workspaceId}/repositories/{repositoryId}` | Get repository metadata and index state |
| Planned | `PATCH /api/v1/workspaces/{workspaceId}/repositories/{repositoryId}` | Update branch, inclusion, or sync settings |
| Planned | `DELETE /api/v1/workspaces/{workspaceId}/repositories/{repositoryId}` | Disconnect repository and schedule indexed-data deletion |
| Planned | `POST /api/v1/workspaces/{workspaceId}/repositories/{repositoryId}/sync` | Start a manual synchronization |
| Planned | `GET /api/v1/workspaces/{workspaceId}/repositories/{repositoryId}/sync/jobs` | List synchronization jobs |
| Planned | `GET /api/v1/workspaces/{workspaceId}/repositories/{repositoryId}/sync/jobs/{jobId}` | Get job status, progress, errors, and commit SHAs |
| Planned | `POST /api/v1/workspaces/{workspaceId}/repositories/{repositoryId}/sync/jobs/{jobId}/retry` | Retry a safe failed job |
| Planned | `POST /api/v1/workspaces/{workspaceId}/repositories/{repositoryId}/sync/jobs/{jobId}/cancel` | Cancel a queued or running job |
| Planned | `GET /api/v1/workspaces/{workspaceId}/repositories/{repositoryId}/overview` | Return index freshness, languages, files, and summary metadata |

The sync response must expose `requestedCommit`, `indexedCommit`, `status`, `progress`, `startedAt`, `completedAt`, `skippedFiles`, and `errors`. A partial job must not be represented as successful.

#### E. GitHub webhook — 1 route

| Status | Method and path | Auth | Purpose |
|---|---|---|---|
| Planned | `POST /api/v1/integrations/github/webhook` | GitHub signature | Accept repository push and relevant GitHub events |

The API must verify `X-Hub-Signature-256` before parsing or enqueueing the event. The handler should return quickly and delegate synchronization to the queue.

#### F. Search, questions, sources, and code understanding — 9 routes

| Status | Method and path | Purpose |
|---|---|---|
| Planned | `POST /api/v1/workspaces/{workspaceId}/repositories/{repositoryId}/search` | Keyword, semantic, or hybrid search |
| Planned | `POST /api/v1/workspaces/{workspaceId}/repositories/{repositoryId}/queries` | Submit a grounded repository question |
| Planned | `GET /api/v1/workspaces/{workspaceId}/repositories/{repositoryId}/queries` | List the user's query sessions |
| Planned | `GET /api/v1/workspaces/{workspaceId}/repositories/{repositoryId}/queries/{queryId}` | Get an answer, freshness state, and limitations |
| Planned | `GET /api/v1/workspaces/{workspaceId}/repositories/{repositoryId}/queries/{queryId}/citations` | List validated citations for an answer |
| Planned | `GET /api/v1/workspaces/{workspaceId}/repositories/{repositoryId}/sources/{sourceId}` | Get source metadata and line ranges |
| Planned | `GET /api/v1/workspaces/{workspaceId}/repositories/{repositoryId}/sources/{sourceId}/content` | Read an authorized source excerpt |
| Planned | `GET /api/v1/workspaces/{workspaceId}/repositories/{repositoryId}/dependencies` | List supported dependency relationships |
| Planned | `POST /api/v1/workspaces/{workspaceId}/repositories/{repositoryId}/impact-analysis` | Analyze likely impact of a file or symbol change |

Search request fields should include `query`, optional `scope`, `branch`, `commitSha`, `fileTypes`, `limit`, and `cursor`. Query responses should include `answer`, `citations`, `freshness`, `indexedCommit`, `insufficientEvidence`, and `limitations`.

The API must distinguish source facts, historical evidence, and model inference. It must not return a citation unless the target exists in the indexed commit and supports the associated claim.

#### G. Settings and audit — 3 routes

| Status | Method and path | Purpose |
|---|---|---|
| Planned | `GET /api/v1/workspaces/{workspaceId}/settings` | Get workspace and provider settings |
| Planned | `PATCH /api/v1/workspaces/{workspaceId}/settings` | Update allowed settings |
| Planned | `GET /api/v1/workspaces/{workspaceId}/audit-events` | List security and administrative events |

Secrets and provider credentials must not be returned by settings endpoints. Audit records should include actor, action, resource, timestamp, correlation ID, and outcome.

### 3.3 Key NestJS request and response contracts

#### Search request

```json
{
  "query": "Where is authentication enforced?",
  "mode": "hybrid",
  "branch": "main",
  "commitSha": "optional-40-character-sha",
  "fileTypes": ["ts", "md"],
  "limit": 20
}
```

#### Search result

```json
{
  "items": [
    {
      "sourceId": "src_123",
      "path": "apps/api/src/common/guards/auth.guard.ts",
      "startLine": 19,
      "endLine": 23,
      "snippet": "...",
      "score": 0.92,
      "commitSha": "..."
    }
  ],
  "total": 1,
  "nextCursor": null
}
```

#### Query response

```json
{
  "queryId": "query_123",
  "answer": "...",
  "citations": [
    {
      "citationId": "citation_123",
      "claim": "...",
      "sourceId": "src_123",
      "path": "...",
      "startLine": 19,
      "endLine": 23,
      "commitSha": "..."
    }
  ],
  "freshness": "current",
  "indexedCommit": "...",
  "insufficientEvidence": false,
  "limitations": []
}
```

Allowed freshness values are `current`, `stale`, and `partial`. If evidence is insufficient, `insufficientEvidence` must be `true` and the answer must state that clearly.

## 4. Python internal service APIs

### 4.1 Service responsibility

The Python service performs compute-heavy work described in `docs/architecture.md`:

- Fetch authorized repository content through a controlled integration.
- Filter and parse supported files and engineering records.
- Chunk content while retaining path, commit, language, and line metadata.
- Generate embeddings and persist document/chunk records.
- Perform hybrid retrieval and optional reranking.
- Validate citations against retrieved source records.
- Extract code symbols and supported relationships.

The preferred production transport for ingestion is a durable queue. The routes below are an internal HTTP control and retrieval API for deployments where NestJS calls the worker directly or for service-to-service diagnostics.

### 4.2 Python target route inventory — 13 routes

All routes use the private `/internal/v1` prefix.

#### A. Worker health — 2 routes

| Method and path | Purpose | Response |
|---|---|---|
| `GET /internal/v1/health` | Python process liveness | `status`, `service`, `version`, `timestamp` |
| `GET /internal/v1/ready` | Queue, database, embedding provider, and parser readiness | `status`, dependency states |

#### B. Ingestion jobs — 6 routes

| Method and path | Purpose |
|---|---|
| `POST /internal/v1/ingestion/jobs` | Create or enqueue an idempotent indexing job |
| `GET /internal/v1/ingestion/jobs/{jobId}` | Get job state and final summary |
| `GET /internal/v1/ingestion/jobs/{jobId}/progress` | Stream or poll progress, skipped files, and parser failures |
| `POST /internal/v1/ingestion/jobs/{jobId}/retry` | Retry a retryable failure |
| `POST /internal/v1/ingestion/jobs/{jobId}/cancel` | Stop queued work and mark the job cancelled |
| `POST /internal/v1/ingestion/jobs/{jobId}/status` | Worker callback for progress and terminal status |

Create-job request:

```json
{
  "workspaceId": "workspace_123",
  "repositoryId": "repository_123",
  "source": "github",
  "repositoryFullName": "org/repo",
  "branch": "main",
  "targetCommit": "40-character-sha",
  "changedPaths": [],
  "deletedPaths": [],
  "mode": "incremental"
}
```

Job states are `queued`, `running`, `partial`, `succeeded`, `failed`, and `cancelled`. The worker must make retries idempotent using the repository, target commit, and job key.

#### C. Retrieval and citation validation — 3 routes

| Method and path | Purpose |
|---|---|
| `POST /internal/v1/retrieval/search` | Run keyword, vector, or hybrid candidate retrieval |
| `POST /internal/v1/retrieval/context` | Build a bounded context window for question answering |
| `POST /internal/v1/retrieval/citations/validate` | Verify source IDs, paths, line ranges, and commit SHA |

Retrieval requests must carry `workspaceId`, `repositoryId`, query text, indexed commit constraints, access filters, and result limits. The worker must never search across workspaces or repositories supplied by a different authorization context.

#### D. Dependency and change-impact analysis — 2 routes

| Method and path | Purpose |
|---|---|
| `POST /internal/v1/analysis/dependencies` | Extract or query supported symbol relationships |
| `POST /internal/v1/analysis/impact` | Return direct references, related tests/configuration, evidence, and confidence |

Analysis responses must include the extraction method and limitations. Static analysis must not be represented as a complete runtime call graph.

### 4.3 Python response contracts

#### Retrieval response

```json
{
  "indexedCommit": "...",
  "results": [
    {
      "chunkId": "chunk_123",
      "sourceId": "src_123",
      "path": "...",
      "startLine": 1,
      "endLine": 20,
      "content": "...",
      "score": 0.91,
      "retrievalMethod": "hybrid"
    }
  ],
  "warnings": []
}
```

#### Ingestion status response

```json
{
  "jobId": "job_123",
  "status": "partial",
  "requestedCommit": "...",
  "indexedCommit": "...",
  "processedFiles": 120,
  "skippedFiles": 4,
  "failedFiles": 2,
  "progress": 0.95,
  "errors": [
    {
      "path": "...",
      "code": "PARSER_ERROR",
      "message": "..."
    }
  ]
}
```

## 5. End-to-end API flows

### Connect and index a repository

1. Browser calls `GET /auth/github` and completes the OAuth callback.
2. Browser calls `POST /workspaces/{workspaceId}/repositories`.
3. NestJS verifies GitHub authorization and creates the repository connection.
4. NestJS calls or enqueues Python `POST /internal/v1/ingestion/jobs`.
5. Browser polls NestJS `GET .../sync/jobs/{jobId}`; NestJS reads worker status or queue state.
6. Python reports `indexedCommit`, progress, skipped paths, and failures.

### Ask a repository question

1. Browser calls NestJS `POST .../queries`.
2. NestJS authorizes the workspace/repository and resolves the latest valid indexed commit.
3. NestJS calls Python retrieval search and context APIs.
4. The answer provider generates a response from the bounded context.
5. NestJS calls citation validation before returning the answer.
6. NestJS returns citations, freshness, limitations, and an insufficient-evidence flag.

### GitHub push synchronization

1. GitHub calls `POST /api/v1/integrations/github/webhook`.
2. NestJS verifies the signature and deduplicates the delivery ID.
3. NestJS resolves changed, renamed, and deleted paths.
4. NestJS enqueues an incremental Python ingestion job.
5. The repository's visible indexed commit changes only after successful or explicitly partial processing.

## 6. Security and operational requirements

- Enforce workspace and repository authorization on every NestJS route that handles repository data.
- Verify GitHub webhook signatures before accepting events.
- Keep Python routes private and authenticate every service-to-service request.
- Do not put access tokens, passwords, secrets, full private files, or embeddings in logs.
- Apply rate limits to login, search, question, sync, and source-content routes.
- Use correlation IDs across NestJS, queue, Python, database, and provider calls.
- Make ingestion and webhook processing idempotent.
- Return `429` for quotas/rate limits and `503` for unavailable dependencies.
- Preserve commit SHA, parser version, chunking version, embedding model, and answer model in query/index metadata.
- Reject or redact likely secrets during ingestion and provide repository disconnect/deletion behavior.

## 7. Implementation order

1. Keep and harden the existing health and authentication routes.
2. Implement persistent users, sessions, workspaces, and authorization.
3. Add GitHub OAuth, repository connections, signed webhooks, and sync job state.
4. Add the Python worker health and ingestion contract, preferably behind a durable queue.
5. Implement search, source inspection, query sessions, and citation validation.
6. Add dependency/change-impact APIs and evaluation fixtures.
7. Add settings, audit events, quotas, and operational dashboards.

The 56-route target is a complete MVP boundary. Routes should be added behind the contracts above as their backing data and service behavior become real; the current placeholder auth behavior must not be treated as production authentication.
