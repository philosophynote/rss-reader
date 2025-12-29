# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Feedly-style RSS reader application with semantic search-based article importance scoring. The system uses AWS serverless architecture for low-cost operation and supports single-user usage with no authentication.

**Key Features:**
- Multi-RSS feed management with folder classification
- Periodic article fetching with idempotent storage
- Article importance scoring using AWS Bedrock semantic search
- Read/unread and save/unsave article management
- Automatic article cleanup (1 week after creation, 1 day after read)

## Development Language

**All responses and generated content must be in Japanese (日本語).**

## Technology Stack

### Backend
- **Language:** Python
- **Framework:** FastAPI
- **Deployment:** AWS Lambda (containerized via Lambda Web Adapter)
- **API Gateway:** Lambda Function URL
- **Scheduler:** EventBridge
- **Database:** DynamoDB
- **AI/ML:** AWS Bedrock (for semantic embeddings)

### Frontend
- **Language:** TypeScript
- **Framework:** React 19.2.3
- **Data Fetching:** TanStack Query
- **Tables:** TanStack Table
- **UI Components:** Chakra UI
- **Hosting:** S3 + CloudFront

### Infrastructure
- **IaC:** AWS CDK (TypeScript)
- **CI/CD:** GitHub Actions

## Project Structure

```
.
├── .kiro/                      # Kiro spec-driven development
│   ├── specs/rss-reader/      # Feature specifications
│   │   ├── requirements.md    # Requirements document
│   │   ├── design.md          # Technical design
│   │   └── tasks.md           # Implementation tasks
│   └── steering/              # (Optional) Project-wide AI guidance
├── docs/                      # Coding conventions
│   ├── python_coding_conventions.md
│   ├── ts_coding_conventions.md
│   └── react_coding_conventions.md
├── backend/                   # (To be created) Python + FastAPI
├── frontend/                  # React 19 + TypeScript
├── infrastructure/            # (To be created) AWS CDK
└── AGENTS.md                  # AI agent instructions
```

## Coding Conventions

When writing code in this repository, **always** reference the relevant convention documents:

- **Python:** `docs/python_coding_conventions.md`
  - PEP 8 compliance, type hints required
  - Docstrings for all functions (PEP 257)
  - Property-based testing with unit tests

- **TypeScript:** `docs/ts_coding_conventions.md`
  - TypeScript 5.x / ES2022 target
  - Pure ES modules only (no CommonJS)
  - Avoid `any`, prefer `unknown` with narrowing
  - Discriminated unions for state machines

- **React:** `docs/react_coding_conventions.md`
  - React 19.2.3 functional components with hooks only
  - TypeScript for all components
  - React Query for server state
  - Chakra UI for styling

## Kiro Spec-Driven Development Workflow

This project follows Kiro-style spec-driven development using custom slash commands.

### Active Specification
- Feature: `rss-reader`
- Location: `.kiro/specs/rss-reader/`
- Status check: `/kiro:spec-status rss-reader`

### Development Phases

**Phase 1: Specification Creation**
1. `/kiro:spec-init [description]` - Initialize new spec
2. `/kiro:spec-requirements [feature]` - Generate requirements
3. `/kiro:spec-design [feature]` - Create technical design (requires requirements review)
4. `/kiro:spec-tasks [feature]` - Generate implementation tasks (requires design review)

**Phase 2: Implementation**
- `/kiro:spec-impl [feature] [task-numbers]` - Execute tasks using TDD methodology
- Tasks must be completed in order with proper test coverage

**Phase 3: Validation**
- `/kiro:validate-design [feature]` - Review technical design quality
- `/kiro:validate-gap [feature]` - Analyze implementation vs requirements gap

**Optional: Steering**
- `/kiro:steering` - Create/update project-wide guidance
- `/kiro:steering-custom` - Create specialized steering for specific contexts

### Important Rules
1. Each phase requires human approval before proceeding
2. Never skip phases (design requires approved requirements, tasks require approved design)
3. Update task status in `tasks.md` as work progresses
4. Follow TDD: write tests before implementation
5. Maintain 80%+ test coverage

## Testing Requirements

### Python
- **Unit tests** for all critical paths using pytest
- **Property-based tests** using Hypothesis for invariant validation
- Test coverage: 80% minimum
- Edge cases: empty inputs, invalid types, boundary values

### TypeScript/React
- **Unit tests** using Vitest
- **Component tests** using React Testing Library
- Test behavior, not implementation details
- Mock external APIs appropriately

### Test Execution
```bash
# Backend tests (when implemented)
cd backend
uv run pytest --cov

# Frontend tests (when implemented)
cd frontend
npm test

# Infrastructure validation (when implemented)
cd infrastructure
npm test
```

## AWS Architecture

### Lambda Functions
1. **API Handler** (FastAPI)
   - Lambda Function URL for HTTP access
   - Container deployment via Lambda Web Adapter

2. **Feed Fetcher** (EventBridge trigger)
   - Scheduled: Every 1 hour
   - Fetches new articles from registered feeds

3. **Article Cleanup** (EventBridge trigger)
   - Scheduled: Daily
   - Deletes articles >1 week old or >1 day after read

### DynamoDB Tables
- Single-table design with GSIs
- Entities: Feeds, Articles, Keywords, ImportanceScores
- Access patterns defined in `design.md`

### Deployment
```bash
# Deploy infrastructure (when implemented)
cd infrastructure
cdk deploy --all

# Deploy backend (when implemented)
# Containerized and deployed via CDK

# Deploy frontend (when implemented)
cd frontend
npm run build
# Uploaded to S3 via CDK
```

## CI/CD Pipeline (GitHub Actions)

### Triggers
- Push to any branch
- Pull request creation

### Pipeline Steps
1. Linting and type checking
2. Unit tests + property-based tests
3. Coverage validation (80% minimum)
4. Security scanning
5. Integration tests
6. Deploy to production (main branch only)

### Required Checks
- All tests pass
- Coverage ≥ 80%
- No security vulnerabilities
- Type checking passes

## Key Implementation Notes

### Semantic Search with AWS Bedrock
- Uses Bedrock embeddings for keyword-article similarity
- Calculate importance score based on keyword weights and semantic similarity
- Cache keyword embeddings to reduce Bedrock API calls
- Store explanations of which keywords contributed to scores

### Idempotent Article Storage
- Use article link URL as unique identifier
- Prevent duplicate storage across feed fetches
- Handle feed parsing errors gracefully with retry logic

### Single-User Architecture
- No authentication required
- No user ID in data models
- Simplified permissions (Lambda has full DynamoDB access)

### RSS Feed Support
- RSS 2.0 and Atom formats only
- Use `feedparser` library for parsing
- No web scraping or custom RSS builders

## Common Development Tasks

Since this project is in early stages, implementation commands will be defined as development progresses. Refer to:
- `tasks.md` for current implementation checklist
- Coding convention docs for language-specific guidelines
- Design doc for architecture decisions

## Important Constraints

### Must Have
- Multiple RSS feed registration with folder classification
- Periodic fetching with safe retry on failure
- Idempotent article storage (by link URL)
- Article list views: chronological and importance-based
- Read/unread and save/unsave management
- Keyword registration with optional weighting
- Importance scoring with explanations

### Must NOT Implement
- Non-RSS support (scraping/RSS builders)
- Authentication or multi-user support
- Always-on servers (serverless only)

## References

- Project requirements: `.kiro/specs/rss-reader/requirements.md`
- Technical design: `.kiro/specs/rss-reader/design.md`
- Implementation tasks: `.kiro/specs/rss-reader/tasks.md`
- Original project description: `README.md`
