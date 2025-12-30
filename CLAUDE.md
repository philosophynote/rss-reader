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
# All projects
make test

# With coverage
make test-coverage

# Backend tests
cd backend
uv run pytest --cov=app --cov-report=term-missing

# Frontend tests
cd frontend
npm run test:coverage

# Infrastructure validation
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
# Deploy infrastructure
cd infrastructure
cdk deploy --all

# Backend deployment
# Containerized and deployed via CDK

# Frontend deployment
cd frontend
npm run build
# Uploaded to S3 via CDK
```

## CI/CD Pipeline (GitHub Actions)

### CI Environment

- **Python**: 3.14 + uv
- **Node.js**: 22
- **Auto Deploy**: main branch only

### Triggers

- Push to any branch
- Pull request creation

### Pipeline Steps

1. **Lint & Format**: Ruff (Python) + ESLint (TypeScript)
2. **Type Check**: Pyright (Python) + TypeScript Compiler
3. **Test**: pytest (Python) + Vitest (TypeScript)
4. **Coverage**: 80% minimum required
5. **Security**: Trivy vulnerability scanning
6. **Integration tests**
7. **Deploy to production** (main branch only)

### Required Checks

- All tests pass
- Coverage ≥ 80%
- No security vulnerabilities
- Type checking passes

### Developer Tools

- **pre-commit**: Automatic pre-commit checks
- **VSCode settings**: Recommended extensions and configuration
- **detect-secrets**: Prevent accidental secret commits

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

## Development Setup and Commands

### Prerequisites

- Python 3.14+
- Node.js 22+
- AWS CLI configured
- uv (Python package manager)

### Quick Start

```bash
# 1. Setup development environment (all projects)
make setup-dev

# 2. Start each service
# Backend
cd backend && uv run uvicorn app.main:app --reload

# Frontend
cd frontend && npm run dev

# Infrastructure (deploy)
cd infrastructure && npm run deploy
```

### Development Commands

```bash
# Code quality checks
make lint          # Lint all projects
make format        # Format all projects
make type-check    # Type check all projects

# Testing
make test          # Run all project tests
make test-coverage # Run tests with coverage

# Cleanup
make clean         # Remove build artifacts and caches
```

### Code Quality Tools

#### Python (Backend)
- **Linter/Formatter**: Ruff (Python 3.14 support)
- **Type Checker**: Pyright (Python 3.14 support)
- **Test Framework**: pytest + Hypothesis (Property-based testing)

#### TypeScript (Frontend)
- **Linter**: ESLint 9 + typescript-eslint (type-aware linting)
- **Type Checker**: TypeScript Compiler (noEmit)
- **Test Framework**: Vitest + Testing Library

#### Individual Project Commands

```bash
# Backend
make backend-lint        # Ruff lint
make backend-format      # Ruff format
make backend-type-check  # Pyright
make backend-test        # pytest with coverage

# Frontend
make frontend-lint       # ESLint
make frontend-format     # ESLint --fix
make frontend-type-check # tsc --noEmit
make frontend-test       # Vitest with coverage

# Infrastructure
make infra-type-check    # tsc --noEmit
make infra-synth         # cdk synth
```

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
