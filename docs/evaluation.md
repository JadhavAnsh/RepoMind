# Evaluation Plan

> This document defines how to measure whether the Organizational Memory Engine retrieves relevant repository evidence, produces supportable answers, and stays synchronized with source repositories.

## 1. Evaluation Objectives

The system must be evaluated on evidence quality, not merely whether an answer sounds plausible.

Primary objectives:

1. Retrieve the source material needed to answer engineering questions.
2. Rank the most useful evidence near the top.
3. Generate answers that are correct relative to repository evidence.
4. Provide citations that genuinely support their associated claims.
5. Recognize when the repository does not contain enough evidence.
6. Explain change impact without overstating static analysis.
7. Keep the index aligned with the repository's current commit.
8. Enforce authorization boundaries with zero tolerated cross-tenant leakage.

## 2. Evaluation Principles

- Build a versioned evaluation set before optimizing retrieval.
- Use realistic questions from representative repositories.
- Record expected evidence for each question.
- Evaluate against a known repository commit.
- Separate retrieval failures from generation and citation failures.
- Include questions with no answer in the indexed repository.
- Measure performance by supported language and document type.
- Keep a regression suite so improvements do not silently break existing behavior.
- Do not claim quality thresholds have been met until tests have been run and results recorded.

## 3. Evaluation Dataset

Create a curated set of repository questions with expected evidence.

### 3.1 Question categories

| Category | Example question | Expected evidence |
|---|---|---|
| Implementation discovery | Where is authentication enforced? | Relevant middleware, guards, route handlers, or authorization checks |
| Dependency discovery | What calls this service? | Supported references to the target service or symbol |
| Design history | Why was this retry policy introduced? | Relevant pull request, issue, commit discussion, or design record |
| Change impact | What might be affected if this interface changes? | Direct references, implementations, tests, and configuration |
| Documentation lookup | How is the service configured? | Relevant README, configuration, and source files |
| Cross-file reasoning | Where is this API route handled and tested? | Route mapping, handler, and associated tests |
| Insufficient evidence | Which database does an undocumented component use? | No reliable supporting evidence; system should abstain or ask for clarification |

### 3.2 Dataset record format

Each evaluation case should record:

- Stable case ID.
- Repository identifier and commit SHA.
- Question text.
- Expected answer points or rubric.
- Expected supporting file paths and line ranges, when known.
- Relevant document types.
- Whether the correct behavior is to answer, qualify, clarify, or abstain.
- Supported language/parser coverage.
- Difficulty and edge-case tags.

Keep evaluation fixtures version-controlled and avoid including secrets or private source material without authorization.

## 4. Metrics

### 4.1 Retrieval quality

**Recall@k**

Measures whether relevant evidence appears within the top `k` retrieved results.

\[
Recall@k = \frac{\text{Relevant evidence retrieved in top }k}
{\text{Total known relevant evidence}}
\]

**Mean Reciprocal Rank (MRR)**

Measures the rank of the first relevant result.

\[
MRR = \frac{1}{N}\sum_{i=1}^{N}\frac{1}{rank_i}
\]

**nDCG**

Measures ranking quality while accounting for graded relevance and result position.

Track retrieval metrics for keyword search, vector search, and hybrid retrieval separately where useful.

### 4.2 Answer and grounding quality

| Metric | What it measures |
|---|---|
| Answer correctness | Whether answer statements match repository evidence |
| Unsupported-claim rate | Share of factual claims not supported by cited/retrieved evidence |
| Citation precision | Share of citations that actually support their associated claims |
| Citation coverage | Share of claims requiring evidence that have valid citations |
| Insufficient-evidence accuracy | Whether the system abstains when the source material cannot support an answer |
| Conflict handling | Whether conflicting sources are surfaced rather than silently reconciled |

A citation is not valid merely because the referenced file exists. It must support the specific claim it accompanies.

### 4.3 Change-impact quality

Evaluate against fixtures where known dependencies and affected tests are available.

- **Precision:** proportion of reported impacts that are genuinely relevant.
- **Recall:** proportion of known relevant impacts that are found.
- **Evidence completeness:** whether each reported relationship includes its source and extraction basis.
- **Uncertainty calibration:** whether incomplete language coverage and dynamic behavior are disclosed.

Do not treat a static dependency graph as a complete runtime call graph.

### 4.4 Indexing and freshness

Measure:

- Ingestion success rate by file type.
- Parser failure rate by language and file type.
- Time from commit/webhook receipt to indexed state.
- Correct handling of changed, added, renamed, and deleted files.
- Stale-index detection accuracy.
- Incremental sync correctness.
- Re-index behavior after parser, chunking, or embedding version changes.

### 4.5 Performance and cost

Track:

- Query latency (median and tail percentiles).
- Ingestion duration by repository size and file type.
- Embedding and LLM usage per query.
- Cost per indexed repository and per answered query.
- Queue wait time and retry frequency.
- GitHub API rate-limit behavior.

Set numeric service-level targets only after measuring representative workloads.

### 4.6 Security and authorization

- Cross-workspace/repository access test failures: **target zero**.
- Unauthorized snippet or embedding exposure: **target zero**.
- Webhook signature verification failures correctly rejected.
- Revoked or disconnected repository access correctly enforced.
- Prompt-injection attempts in repository content do not override system instructions or access controls.

Security tests are release gates, not merely quality metrics.

## 5. Required Edge Cases

Include at least the following cases in the evaluation suite:

- Renamed symbols.
- Duplicate function or class names.
- Outdated documentation that conflicts with current code.
- Conflicting issue or pull-request comments.
- Large files and unusually long functions.
- Deleted and renamed files.
- Missing line-range metadata.
- Parser failures and unsupported languages.
- Dynamic imports or runtime-generated relationships.
- Questions whose answers are absent from the repository.
- Stale embeddings after a new commit.
- Partial ingestion with some files skipped.
- Access revoked after indexing.
- Repository content containing prompt-injection instructions.
- Similar code in separate repositories or workspaces.

## 6. Evaluation Workflow

1. Select a fixed repository commit and record its SHA.
2. Run ingestion and record skipped files and parser errors.
3. Run the versioned question set.
4. Capture retrieved chunks, ranking, metadata, and freshness state.
5. Capture generated answers and structured citations.
6. Validate citation targets and source support.
7. Score answer correctness against the expected evidence rubric.
8. Run change-impact fixtures and compare expected relationships.
9. Run authorization and prompt-injection tests.
10. Record latency, provider usage, and failures.
11. Compare results against the previous evaluation run.
12. Investigate regressions before changing production defaults.

## 7. Human Review Rubric

Reviewers should score each answer on these dimensions:

| Dimension | Pass condition |
|---|---|
| Evidence relevance | Retrieved sources are relevant to the question |
| Factual correctness | Claims agree with the indexed repository state |
| Citation validity | Paths, line ranges, and commit references resolve and support claims |
| Completeness | Important evidence is not omitted without explanation |
| Uncertainty | Gaps, conflicts, and inferred relationships are clearly labeled |
| Freshness | The answer identifies stale or partial indexing when relevant |
| Safety | No unauthorized repository content is exposed |

Use a consistent scoring scale in the evaluation implementation. Record reviewer notes for failures and ambiguous cases.

## 8. Regression Gates

A release candidate should not proceed when:

- Any cross-tenant authorization test fails.
- Citation validation accepts fabricated or mismatched source locations.
- Deleted or changed content continues to be represented as current without a stale indicator.
- Prompt injection in repository content changes system behavior or authorization.
- The system claims an answer is verified when evidence is missing.
- A material retrieval or answer-quality regression is unexplained.

Numeric thresholds for retrieval, citation coverage, answer quality, and latency should be established from baseline runs rather than invented in advance.

## 9. Experiment Tracking

For each evaluation run, record:

- Run ID and timestamp.
- Application version/commit.
- Evaluation dataset version.
- Repository commit SHAs.
- Parser and chunking versions.
- Embedding provider/model/version.
- LLM provider/model/configuration.
- Retrieval filters and `k` values.
- Reranker configuration, if used.
- Metric results.
- Failed case IDs and failure categories.
- Latency and estimated provider cost.

This makes results reproducible and helps distinguish model changes from indexing or retrieval changes.

## 10. Initial MVP Evaluation Checklist

- [ ] Create a versioned set of realistic repository questions.
- [ ] Define expected evidence for each answerable case.
- [ ] Include questions that must result in insufficient evidence.
- [ ] Measure Recall@k and MRR or nDCG.
- [ ] Measure citation precision and citation coverage.
- [ ] Measure answer correctness and unsupported-claim rate.
- [ ] Measure insufficient-evidence accuracy.
- [ ] Test change-impact precision/recall on known fixtures.
- [ ] Test index freshness after commits.
- [ ] Measure ingestion success by file type.
- [ ] Measure query latency and provider cost.
- [ ] Run cross-tenant authorization tests with zero failures.
- [ ] Add all discovered regressions to the permanent test set.

## 11. Reporting Format

Every evaluation report should include:

1. **Summary:** what was evaluated and against which versions.
2. **Dataset:** repositories, commit SHAs, question count, and category coverage.
3. **Metrics:** retrieval, answer, citation, change-impact, freshness, performance, and security.
4. **Regressions:** failed cases with IDs and evidence.
5. **Limitations:** unsupported languages, missing fixtures, or incomplete measurements.
6. **Decision:** pass, fail, or inconclusive, with reasons.
7. **Next actions:** prioritized fixes and follow-up experiments.

Never report a metric as measured if the corresponding evaluation has not actually been run.
