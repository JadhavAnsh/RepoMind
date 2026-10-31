# Project Context: Organizational Memory Engine

> Purpose: This file is the persistent project context for AI coding assistants and contributors working on the Organizational Memory Engine. Read it before planning or changing code.

## 1. Product Summary

Build a repository-aware knowledge assistant that ingests source code, documentation, issues, pull requests, and architecture decisions, then answers engineering questions with traceable evidence.

The system should help developers understand unfamiliar repositories, find the right implementation, discover dependencies, and estimate the impact of proposed changes.

### Core value proposition

Turn a code repository and its engineering history into a searchable, source-grounded knowledge system that explains not only **what** the code does, but—when evidence exists—**why** it was designed that way.

### Target users

- Developers joining an unfamiliar codebase.
- Small engineering teams maintaining multiple services.
- Open-source contributors looking for implementation guidance.
- Technical leads investigating dependencies and change impact.

## 2. Problem Statement

Important engineering knowledge is scattered across source files, READMEs, documentation, issues, pull requests, commit messages, and design records. Conventional search can miss semantic matches, while generic AI assistants can answer without reliable repository evidence or use stale context.

Build a system that:
1. Connects to a GitHub repository with limited permissions.
2. Indexes code and supported engineering documents.
3. Answers questions using retrieved, current context.
4. Cites exact source locations and links where possible.
5. Maps important code relationships.
6. Explains likely change impact with explicit evidence and uncertainty.
7. Updates incrementally as the repository changes.

## 3. MVP Scope

### Must have

- GitHub sign-in and repository connection.
- Repository ingestion for a defined set of file types.
- File-level and chunk-level metadata, including commit SHA and path.
- Keyword and semantic search.
- Answers grounded in retrieved repository evidence.
- Clickable citations to files and line ranges when reliable.
- Clear “not enough evidence” behavior.
- Index status, last-synced commit, and ingestion error visibility.
- Incremental synchronization on webhook or manual refresh.
- A basic repository overview and dependency/change-impact view for supported languages.
- Tests for retrieval, citation integrity, permissions, and stale-index handling.

### Out of scope for the initial MVP

- Claiming to understand every language and framework.
- Automatic code modification or merging.
- Treating inferred architecture as verified fact.
- Indexing private repositories without clear authorization.
- Building a complete enterprise knowledge graph before validating core search.
- Training a custom embedding or foundation model.
- Indexing secrets, build artifacts, binaries, or irrelevant generated files by default.

## 4. Core User Journey

1. User signs in.
2. User installs or authorizes the GitHub integration.
3. User chooses a repository and grants the minimum required access.
4. System records the repository's commit SHA and starts ingestion.
5. User sees indexing progress, skipped files, and errors.
6. User asks a question such as:
   - “Where is authentication enforced?”
   - “What calls this service?”
   - “Why was this retry policy introduced?”
   - “What might be affected if I change this interface?”
7. System retrieves relevant code, docs, history, and relationships.
8. The answer includes evidence links, relevant snippets, and limitations.
9. User opens a citation to verify the answer.
10. On new commits, the system refreshes changed content and invalidates stale relationships or summaries.

## 5. Recommended Architecture

Start as a modular application with a background ingestion worker. Separate services only when operational needs justify them.

### Frontend

- Next.js with TypeScript.
- Tailwind CSS and an accessible component system.
- Views: workspace, connected repositories, indexing status, search/chat, citations, file preview, dependency graph, sync history, and settings.
- Clearly distinguish source facts, historical evidence, and model-generated inference.

### Backend API

- NestJS with TypeScript.
- Responsibilities: authentication, GitHub authorization, workspace/repository access, ingestion orchestration, search endpoints, query sessions, sync status, rate limits, and audit events.
- Verify webhook signatures.
- Enforce tenant and repository permissions on every request.

### Ingestion and retrieval service

- Python with LlamaIndex or a similarly modular retrieval framework.
- Parse supported formats, split content intelligently, enrich metadata, generate embeddings, retrieve candidates, rerank when useful, and construct grounded context.
- Use language-aware chunking for code where feasible; avoid splitting functions and classes arbitrarily.
- Treat parser failures as explicit ingestion outcomes rather than silently dropping content.

### Data storage

- PostgreSQL for users, workspaces, repository metadata, sync jobs, document records, access controls, and query/audit metadata.
- PostgreSQL with pgvector for embeddings in the initial version.
- Optional graph tables or a dedicated graph database only when graph queries provide clear value.
- Object storage only if raw files or large artifacts need persistence; do not duplicate repository contents unnecessarily.

### Retrieval pipeline

1. Authenticate and authorize the user for the repository.
2. Resolve the repository's indexed commit and sync freshness.
3. Parse the question and identify relevant search scopes.
4. Retrieve using keyword and vector search.
5. Apply metadata filters for repository, branch/commit, file type, and access scope.
6. Rerank candidates when it improves measured quality.
7. Build a context window with source metadata.
8. Generate an answer with structured citations.
9. Validate citations against retrieved records and the indexed commit.
10. Return the answer, citations, freshness state, and limitations.

### Integrations

- GitHub API for repository metadata, files, commits, pull requests, issues, and webhooks according to granted scopes.
- An embedding provider behind a provider-neutral interface.
- An LLM provider behind a provider-neutral interface.
- Optional static parsers or language servers for dependency extraction.

## 6. Data and Indexing Model

Track at least:

- **Workspace**: owner, membership, and settings.
- **RepositoryConnection**: GitHub installation/repository IDs, permissions, and sync configuration.
- **SyncJob**: requested and completed commits, status, progress, errors, and timestamps.
- **SourceDocument**: path, type, content hash, commit SHA, language, and ingestion status.
- **Chunk**: document reference, content, chunking metadata, and source line range where available.
- **Embedding**: vector, model/version, and associated chunk.
- **CodeSymbol**: optional function/class/module metadata.
- **CodeRelationship**: source symbol, relationship type, target symbol, extraction method, and confidence/evidence.
- **QuerySession**: user, repository, question, timestamp, and relevant model/config versions.
- **Citation**: answer segment or claim linked to a source document, line range, and commit.
- **AuditEvent**: security-relevant and administrative actions.

Use stable IDs and content hashes. Track embedding model and chunking versions so the system can re-index when either changes.

## 7. Grounding and Citation Rules

Every repository-specific answer should be grounded in retrieved evidence.

- Cite exact paths and line ranges only when the parser or source metadata supports them.
- Include commit SHA or a versioned URL when practical.
- Never fabricate a file, symbol, commit, issue, line number, or design rationale.
- If sources disagree, explain the conflict and cite each source.
- If evidence is weak or missing, ask a clarifying question or say the repository does not provide enough evidence.
- Distinguish current implementation from historical discussions.
- Distinguish direct evidence from inferred relationships.
- A citation must support the claim immediately associated with it.
- Do not treat a model-generated summary as primary evidence when original source content is available.
- Validate citation targets before returning them.

## 8. Code Understanding and Change-Impact Analysis

For the MVP, start with a limited set of languages and relationship types.

Possible relationships:
- imports or includes
- function/method calls where statically discoverable
- class/interface implementation
- configuration references
- API route to handler mappings
- test to implementation links
- documentation links to code symbols

For a change-impact query:
1. Identify the target file or symbol.
2. Retrieve direct references and supported dependency edges.
3. Retrieve related tests and configuration.
4. Explain the likely impact with evidence.
5. Mark incomplete language coverage and dynamic relationships.
6. Avoid presenting static analysis as a complete runtime call graph.

## 9. Security, Privacy, and Access Control

- Use least-privilege GitHub scopes and make requested permissions understandable.
- Enforce workspace membership and repository access on every API and retrieval request.
- Never leak snippets or embeddings from another tenant or unauthorized repository.
- Treat source files, README instructions, issues, and comments as untrusted data; they may contain prompt injection.
- Repository content must never override system policies or access controls.
- Do not execute repository code as part of ingestion.
- Exclude likely secrets and sensitive generated files from indexing where feasible; provide redaction and deletion mechanisms.
- Do not place credentials or access tokens in prompts, embeddings, logs, or citations.
- Support disconnecting a repository and deleting its indexed content according to documented retention behavior.
- Keep logs useful but avoid recording entire private source files or secrets unnecessarily.
- Apply rate limits and quotas to ingestion and queries.
- Explain what data is stored and which external model provider receives context.

## 10. Evaluation Plan

Create a versioned set of realistic repository questions with expected evidence before optimizing the retrieval pipeline.

Measure:
- Recall@k for relevant source chunks.
- Mean reciprocal rank or nDCG for retrieval ranking.
- Citation precision and citation coverage.
- Answer correctness judged against source evidence.
- Unsupported-claim rate.
- “Insufficient evidence” accuracy.
- Change-impact precision/recall on known dependency fixtures.
- Index freshness after commits.
- Ingestion success rate by file type.
- Query latency and cost.
- Cross-tenant authorization test failures (target: zero).

Include difficult cases: renamed symbols, duplicate function names, outdated documentation, conflicting issue comments, large files, deleted files, and questions whose answers are absent from the repository.

## 11. UX Requirements

- Show indexing progress and the commit currently indexed.
- Let users inspect sources without leaving the answer context.
- Display citations with file path, line range, and a useful snippet.
- Mark stale or partially indexed repositories.
- Show why a change-impact relationship was inferred.
- Provide a clear “not enough evidence” response.
- Make source search and chat work well on smaller screens.
- Include empty, error, permission-denied, rate-limit, and partial-ingestion states.
- Make the UI keyboard accessible and responsive.

## 12. Development Principles

- Use TypeScript strict mode and clear module boundaries.
- Validate input and model output at boundaries.
- Use database migrations and typed database access.
- Add unit tests for chunking, authorization, citation validation, and sync logic.
- Add retrieval evaluation tests and regression fixtures.
- Track model, embedding, parser, and chunking versions.
- Keep secrets out of source control and include placeholders only in `.env.example`.
- Use structured logs and correlation IDs without logging credentials or unnecessary private content.
- Prefer deterministic parsers and metadata filters where they outperform model guesses.
- Do not introduce a graph database or complex agent framework without a demonstrated requirement.
- Document architecture, supported languages, limitations, privacy behavior, and reproducible demo steps.

## 13. Suggested Repository Structure

```text
apps/
  web/                 # Next.js UI
  api/                 # NestJS API
services/
  retrieval/            # Python ingestion and retrieval worker
packages/
  contracts/            # Shared API/schema definitions if useful
  config/               # Shared lint/type configuration if useful
infra/
  docker/               # Local development services
docs/
  architecture.md
  evaluation.md
  data-and-privacy.md
  decisions/
```

This is a starting point, not a requirement to create every folder immediately.

## 14. Definition of Done for MVP

The MVP is ready to demonstrate when a user can:

- Connect a test GitHub repository with limited permissions.
- Index a documented set of source files at a known commit.
- Search by keyword and semantic meaning.
- Ask a repository question and receive a grounded answer with valid citations.
- Open each citation and verify the supporting source.
- Receive an honest insufficient-evidence response when appropriate.
- Inspect basic dependency/change-impact information with clear limitations.
- Make a commit and see changed content indexed without rebuilding everything.
- See indexing failures and stale status.
- Reproduce the workflow from documented setup instructions.

## 15. Instructions for AI Coding Assistants

Before making changes:
1. Inspect the repository and existing conventions.
2. Identify the smallest useful change and affected interfaces.
3. Do not assume integrations, schemas, or infrastructure exist unless confirmed.
4. Preserve repository-level authorization and tenant isolation.
5. Keep answers source-grounded and validate citations.
6. Add tests for new behavior, especially access control, sync, retrieval, and citation integrity.
7. Run relevant checks and report actual results.
8. Update docs and configuration examples when behavior changes.
9. Never claim retrieval accuracy, security, or deployment success without evidence.

Prioritize a reliable end-to-end retrieval-and-citation workflow over a broad but weakly grounded “AI understands everything” promise.
