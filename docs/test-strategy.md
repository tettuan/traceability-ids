# Test Strategy

## Overview

This document defines the testing strategy for the traceability-ids project. We employ a comprehensive testing approach that emphasizes unit testing, integration testing, and strategic logging for debugging complex test scenarios.

## Testing Philosophy

### Core Principles

1. **Test-Driven Development**: Write tests first to clarify requirements
2. **Isolation**: Each test should be independent and deterministic
3. **Coverage**: Prioritize critical paths and edge cases
4. **Strategic Logging**: Use breakdownlogger for debugging complex test scenarios
5. **Fast Feedback**: Tests should run quickly for rapid iteration

### Test Pyramid

```
    /\
   /  \    E2E Tests (few)
  /----\
 /      \  Integration Tests (moderate)
/--------\
|        | Unit Tests (many)
----------
```

## Testing Tools

### Primary Tools

- **Deno Test**: Built-in test runner
- **@std/assert**: Assertion library
- **@tettuan/breakdownlogger**: Strategic logging for debugging

### BreakdownLogger Integration

BreakdownLogger is a test-only logging utility designed to help debug complex test scenarios without cluttering production code.

#### Key Features

- **Test-only execution**: Only works in test files (`*_test.ts`, `*.test.ts`)
- **Configurable log levels**: debug, info, warn, error
- **Message length control**: Customizable output truncation
- **Key-based filtering**: Filter logs by component identifier
- **Environment variable configuration**: Zero-code setup

#### Environment Variables

```bash
# Set log level (debug, info, warn, error)
export LOG_LEVEL=debug

# Control message length
# S=160, L=300, W=whole, default=80
export LOG_LENGTH=L

# Filter by specific logger keys (comma/colon/slash separated)
export LOG_KEY=distance,clustering
```

#### Usage Example

```typescript
import { assertEquals } from "jsr:@std/assert";
import { BreakdownLogger } from "@tettuan/breakdownlogger";

Deno.test("Distance calculation with debugging", () => {
  const logger = new BreakdownLogger("distance-test");

  const calculator = new StructuralDistance();
  logger.debug("Testing distance calculation", {
    id1: "req:apikey:security-abc123#v1",
    id2: "req:apikey:encryption-def456#v1",
  });

  const distance = calculator.calculate("req:apikey:security", "req:apikey:encryption");
  logger.info("Distance calculated", { distance });

  assertEquals(distance < 1.0, true);
});
```

#### Running Tests with Logging

```bash
# Run with debug logging enabled
LOG_LEVEL=debug deno task test

# Filter to specific components
LOG_KEY=distance,clustering LOG_LEVEL=debug deno task test

# Use longer message format for complex data
LOG_LENGTH=L LOG_LEVEL=debug deno task test

# Debug only specific test files
LOG_KEY=structural LOG_LEVEL=debug deno test src/distance/structural.test.ts
```

## Test Categories

### 1. Unit Tests

**Purpose**: Test individual functions and classes in isolation

**Location**: `src/**/*.test.ts`

**Naming Convention**: `{module}.test.ts`

**Coverage Target**: 90%+ for core business logic

**Examples**:
- Distance calculator algorithms
- Clustering algorithms
- ID extraction and parsing
- Formatter functions

**BreakdownLogger Use Cases**:
- Debugging algorithm implementations
- Inspecting intermediate calculation steps
- Validating complex data transformations

```typescript
// Example: Distance calculator unit test with logging
import { BreakdownLogger } from "@tettuan/breakdownlogger";

Deno.test("StructuralDistance - same structure, different values", () => {
  const logger = new BreakdownLogger("structural-distance");
  const calculator = new StructuralDistance();

  const id1 = "req:apikey:security-abc123#v1";
  const id2 = "req:apikey:encryption-def456#v1";

  logger.debug("Calculating structural distance", { id1, id2 });
  const distance = calculator.calculate(id1, id2);

  logger.info("Distance result", {
    distance,
    expected: "< 0.5 (same scope and level)",
  });

  assertEquals(distance < 0.5, true);
});
```

### 2. Integration Tests

**Purpose**: Test interactions between modules

**Location**: `src/**/*.integration.test.ts` (future)

**Coverage Target**: Critical user workflows

**Examples**:
- End-to-end clustering pipeline
- Search mode with deduplication
- Extract mode with context retrieval

**BreakdownLogger Use Cases**:
- Tracing data flow through pipeline
- Debugging integration points
- Monitoring state changes

### 3. Mode Runner Tests (Future)

**Purpose**: Test CLI mode execution logic

**Location**: `src/modes/*.test.ts`

**Examples**:
- Cluster mode execution
- Search mode execution
- Extract mode execution

**BreakdownLogger Use Cases**:
- Debugging CLI argument processing
- Tracing mode execution flow
- Validating output generation

## Test Organization

### Directory Structure

```
src/
├── clustering/
│   ├── hierarchical.ts
│   ├── hierarchical.test.ts       # Unit tests
│   ├── kmeans.ts
│   ├── kmeans.test.ts
│   └── dbscan.test.ts
├── distance/
│   ├── cosine.ts
│   ├── cosine.test.ts
│   ├── structural.ts
│   └── structural.test.ts
├── modes/                          # Future: Add mode tests
│   ├── cluster.ts
│   ├── cluster.test.ts (TODO)
│   ├── search.ts
│   └── search.test.ts (TODO)
└── core/
    ├── extractor.ts
    ├── extractor.test.ts
    └── scanner.ts
```

### Test Naming Conventions

```typescript
// Pattern: "{ModuleName} - {specific behavior}"
Deno.test("CosineDistance - identical strings", () => { ... });
Deno.test("HierarchicalClustering - threshold controls merging", () => { ... });
Deno.test("extractIdsFromFile - duplicate IDs", () => { ... });
```

## Strategic Logging Guidelines

### When to Use BreakdownLogger

✅ **DO USE** for:
- **Complex algorithms**: Distance calculations, clustering logic
- **Data transformations**: When debugging unexpected output
- **Integration points**: Tracing data flow between modules
- **Edge cases**: When testing boundary conditions
- **Failing tests**: To understand why a test is failing

❌ **DON'T USE** for:
- **Simple assertions**: Use standard test output
- **Production code**: BreakdownLogger is test-only
- **Every test**: Only for debugging complex scenarios

### Logger Key Naming Convention

Use hierarchical keys that match module structure:

```typescript
// Distance calculators
new BreakdownLogger("distance/cosine")
new BreakdownLogger("distance/structural")

// Clustering algorithms
new BreakdownLogger("clustering/hierarchical")
new BreakdownLogger("clustering/kmeans")

// Extraction
new BreakdownLogger("extract/context")
new BreakdownLogger("extract/loader")

// Mode runners
new BreakdownLogger("mode/cluster")
new BreakdownLogger("mode/search")
```

### Log Level Guidelines

| Level | Usage |
|-------|-------|
| `debug` | Detailed algorithm steps, intermediate values, data transformations |
| `info` | Test milestones, major operations, configuration |
| `warn` | Potential issues, boundary conditions, performance warnings |
| `error` | Test failures, unexpected errors, validation failures |

### Example: Debugging Complex Test

```typescript
import { BreakdownLogger } from "@tettuan/breakdownlogger";

Deno.test("Clustering - DBSCAN with noise points", () => {
  const logger = new BreakdownLogger("clustering/dbscan");

  const clustering = new DBSCANClustering(0.3, 2);
  const ids = [/* test data */];

  logger.debug("Starting DBSCAN", {
    epsilon: 0.3,
    minPoints: 2,
    dataSize: ids.length,
  });

  const matrix = createDistanceMatrix(ids.map(id => id.fullId), calculator);
  logger.debug("Distance matrix created", {
    dimensions: `${matrix.length}x${matrix[0].length}`,
  });

  const clusters = clustering.cluster(ids, matrix);

  logger.info("Clustering complete", {
    clusterCount: clusters.length,
    noiseClusters: clusters.filter(c => c.length === 1).length,
  });

  // Detailed cluster inspection
  clusters.forEach((cluster, idx) => {
    logger.debug(`Cluster ${idx}`, {
      size: cluster.length,
      ids: cluster.map(id => id.semantic),
    });
  });

  assertEquals(clusters.filter(c => c.length === 1).length, 2);
});
```

## Test Execution

### Standard Test Run

```bash
deno task test
```

### Debug Mode

```bash
# Debug all tests
LOG_LEVEL=debug deno task test

# Debug specific module
LOG_KEY=clustering LOG_LEVEL=debug deno task test

# Debug single test file with full output
LOG_LENGTH=W LOG_LEVEL=debug deno test src/clustering/dbscan.test.ts
```

### CI/CD Integration

Tests run automatically via:
```bash
deno task ci
```

This includes:
1. Type checking
2. Test execution
3. Lint checking
4. Format checking
5. JSR compatibility check

## Coverage Goals

| Category | Target |
|----------|--------|
| Core business logic | 90%+ |
| Distance calculators | 100% |
| Clustering algorithms | 100% |
| Formatters | 80%+ |
| CLI entry points | 60%+ |

## Future Enhancements

### Planned Improvements

1. **Integration Tests**: Add end-to-end pipeline tests
2. **Performance Tests**: Benchmark critical algorithms
3. **Property-Based Testing**: Use fuzzing for algorithm robustness
4. **Mode Runner Tests**: Test CLI execution logic
5. **Coverage Reporting**: Add coverage analysis to CI

### BreakdownLogger Patterns

1. **Test Fixtures with Logging**: Create reusable test data with logging
2. **Custom Matchers**: Build assertion helpers with debug output
3. **Test Reporters**: Generate test execution summaries

## Best Practices

### Test Writing

1. **AAA Pattern**: Arrange, Act, Assert
2. **One Assertion Per Test**: Focus on single behavior
3. **Descriptive Names**: Test names should read like specifications
4. **Avoid Test Interdependencies**: Each test should stand alone
5. **Use Fixtures**: Create reusable test data

### Debugging with BreakdownLogger

1. **Start Minimal**: Begin without logging, add as needed
2. **Strategic Placement**: Log at decision points and transformations
3. **Structured Data**: Use objects for rich context
4. **Hierarchical Keys**: Match module structure for filtering
5. **Clean Up**: Remove debug logging once issue is resolved

### Performance

1. **Fast Tests**: Each test should run in milliseconds
2. **Parallel Execution**: Deno runs tests in parallel by default
3. **Avoid Heavy I/O**: Use temporary files, clean up after tests
4. **Mock External Dependencies**: Isolate tests from network/filesystem

## References

- [Deno Testing Documentation](https://docs.deno.com/runtime/manual/basics/testing/)
- [BreakdownLogger on JSR](https://jsr.io/@tettuan/breakdownlogger)
- [@std/assert Documentation](https://jsr.io/@std/assert)

## Changelog

- 2025-01-12: Initial test strategy document
- 2025-01-12: Added BreakdownLogger integration and guidelines
