---
name: db-schema
description: Analyze a GitHub OSS project's database and persistence situation in detail. Use when the user asks about DB schema, databases, migrations, models, storage, ORM usage, data flow, or the project's DB situation.
---

# Database Schema Review

Use this skill to produce a detailed view of the project's database and persistence situation.

## Instructions

1. Identify every persistence layer:
   - SQL and NoSQL databases
   - ORMs, query builders, migration tools, schema files, seed data
   - local storage, file-backed data, caches, queues, search indexes, vector stores, and external managed services

2. Inspect the concrete schema sources before summarizing:
   - migrations, `schema.prisma`, model definitions, SQL files, fixtures, Docker Compose services, env examples, README setup docs, and app configuration
   - code paths that create, read, update, delete, sync, import, or export persisted data

3. Build a clear database inventory:
   - database/service name
   - technology and connection/config source
   - owning module or package
   - tables/collections/entities
   - important fields, indexes, constraints, relationships, and lifecycle rules
   - migration or initialization path

4. Explain runtime data flow:
   - where writes originate
   - where reads are consumed
   - transaction boundaries or consistency assumptions
   - background jobs, queues, sync loops, and cache invalidation

5. Call out risks and gaps:
   - missing migrations, undocumented setup, schema drift, destructive migrations, weak constraints, missing indexes, unclear ownership, unsafe secrets handling, and data loss risks
   - distinguish confirmed facts from guesses

## Output Format

Return a concise but detailed report:

```markdown
# Database Situation

## Executive Summary
[Short overview of DB technologies, schema maturity, and main risks.]

## Database Inventory
[List each DB/storage layer with purpose, config source, schema source, and ownership.]

## Schema Details
[Tables/collections/entities, key fields, relationships, constraints, indexes, migrations.]

## Data Flow
[Important read/write paths and background processing.]

## Setup And Operations
[How to initialize, migrate, seed, backup, or reset data if discoverable.]

## Risks And Open Questions
[Prioritized issues, uncertainty, and what should be checked next.]
```
