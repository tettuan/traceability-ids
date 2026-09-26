# traceability-ids

A CLI tool for extracting and clustering traceability IDs from Markdown files
(and, with `--ext`, source code or any text file) based on similarity.

[![JSR](https://jsr.io/badges/@aidevtool/traceability-ids)](https://jsr.io/@aidevtool/traceability-ids)
[![JSR Score](https://jsr.io/badges/@aidevtool/traceability-ids/score)](https://jsr.io/@aidevtool/traceability-ids)

## Use Case

Assigning a **traceability ID** to each entry in your documents gives you two
things at once:

- **Searchability** — IDs follow a structured format
  (`{level}:{scope}:{semantic}-{hash}#{version}`), so related entries can be
  found and grouped far more reliably than free-text search.
- **History management** — the `#{version}` component records when an entry was
  written or revised, so the same logical item can be tracked across edits and
  over time. This turns the documents into a **decision history**: how a
  requirement or design evolved, and why, stays traceable across revisions.

These benefits apply to a wide range of cases — from **product requirements**,
where each requirement is tracked from definition through revision, to
**strategic decision-making**, where the rationale behind a choice and its later
changes remain traceable. Any domain where documents carry decisions and evolve
over time can adopt the same scheme.

**This repository is a tool that searches by similar IDs.** Rather than matching
exact strings, it clusters traceability IDs by similarity and returns a unique
list sorted by closeness — so you can discover where related IDs live across your
Markdown documents, even when you don't know the exact ID.

## Overview

This tool automatically extracts traceability IDs from Markdown files (or any
file types selected with `--ext`) and clusters them based on string similarity. Implemented in pure TypeScript with
support for multiple clustering algorithms and distance calculation methods.

### Purpose

While `grep` can easily find traceability IDs in files, **discovering the
location of similar IDs** is difficult.

This tool extracts IDs and clusters them by similarity, outputting a **unique ID
list sorted by similarity**. This enables:

- Inferring which files contain similar IDs
- Easier discovery of related IDs by reviewing them in clustered order
- Simple ID-only output (file locations can be found with `grep`)
- Deduplication when the same ID appears in multiple files

## Features

- **Multiple Clustering Algorithms**
  - ✅ Hierarchical Clustering
  - ✅ K-Means Clustering
  - ✅ DBSCAN (Density-Based Spatial Clustering)

- **Various Distance Calculation Methods**
  - ✅ Levenshtein Distance
  - ✅ Jaro-Winkler Distance
  - ✅ Cosine Similarity
  - ✅ Structural Distance

- **Multiple Output Formats**
  - **Simple (default)** - Unique ID list only (one per line)
  - **Simple-Clustered** - IDs grouped by cluster
  - JSON - Full structured data
  - Markdown - Human-readable format
  - CSV - Spreadsheet compatible

- **3D Graph Visualization** (`/graph`)
  - Interactive 3D force-directed graph
  - MDS layout preserving distances
  - Color by cluster, scope, or level
  - Declared relations `derived_from` / `trace_to` drawn as arrows, broken links reported
  - Rectangle selection and keyboard navigation

- **Relations as Data** (`/relations`)
  - `derived_from` / `trace_to` declarations, one row per declaration with `file:line`
  - Filter by IDs and direction (`in` / `out` / `both`), by relation kind
  - Broken relations with their reason: `NodeMissing` or `VersionMissing`
  - simple, TSV and JSON output

- **ID Index / Listing** (`/list`)
  - Extract all IDs with occurrence information (file + line)
  - Narrow to given IDs (`--ids`), count occurrences per file or per ID
  - JSON, simple, CSV, locations and count output formats
  - Sort by fullId, scope, level, or occurrence count
  - Batch splitting for large datasets

- **Document Analysis Report** (`/analyze`)
  - Structure coverage and traceability chain analysis
  - Version freshness and specification expansion rate
  - Near-duplicate detection and cross-file duplication
  - Gap analysis with improvement actions

- **Pure TypeScript Implementation**
  - No external dependencies
  - Works with Deno
  - Designed for JSR publication

## Traceability ID Format

```
{level}:{scope}:{semantic}[-{hash}][#{version}]
```

### Components

- `{level}`: String before the first colon
- `{scope}`: String between first and second colon
- `{semantic}`: String from second colon to the last hyphen (to the end when there is no hash)
- `{hash}`: String from the last hyphen to the hash symbol, when it has the hash form
- `{version}`: String after the hash symbol (optional)

The last hyphenated segment is the hash only when it has the hash form: by default
6 lowercase letters or digits with at least one digit (`3kd92z`, `4f7b2e`). Otherwise
the ID has no hash and the segment belongs to the semantic:
`req:auth:login-flow` is semantic `login-flow`, hash `""`. `--hash-pattern` changes the
form; `--require-hash` excludes IDs without a hash. An ID needs a hyphen after the
second colon: `req:auth:login` is not an ID.

### Example

```
req:projA:auth-timeout-3kd92z#20250903a   # versioned
req:projA:auth-timeout-3kd92z             # versionless reference (unique key)
```

A versionless ID is recognized only when the hash is not followed by a letter,
digit, `_`, `-` or `#`. A bare trailing `#` (`...-3kd92z#`) is not an ID.
Versionless recognition trades some false positives for finding references
written without a version.

Versions are ordered with digit runs compared as numbers
(`20260810` > `20251111b` > `20251111a`, `v10` > `v2`).

## Installation

```bash
deno install --allow-read --allow-write jsr:@aidevtool/traceability-ids
```

Or run directly without installation:

```bash
deno run --allow-read --allow-write jsr:@aidevtool/traceability-ids [options] <input-path...>
```

## Usage

The CLI supports flexible argument order - options and input directory can be in any order.

### Basic Usage

```bash
# Output to STDOUT (default)
deno run --allow-read --allow-write jsr:@aidevtool/traceability-ids ./docs

# Output to file
deno run --allow-read --allow-write jsr:@aidevtool/traceability-ids ./docs --output clusters.txt

# Options can be in any order
deno run --allow-read --allow-write jsr:@aidevtool/traceability-ids \
  --threshold 0.2 ./docs --output clusters.txt
```

### Cluster Mode (Default)

```bash
# Simple ID list (default format)
deno run --allow-read --allow-write jsr:@aidevtool/traceability-ids ./data

# IDs grouped by cluster
deno run --allow-read --allow-write jsr:@aidevtool/traceability-ids ./data \
  --format simple-clustered --output clusters.txt

# Scope-based grouping (recommended)
deno run --allow-read --allow-write jsr:@aidevtool/traceability-ids ./data \
  --distance structural --threshold 0.3

# K-Means clustering with 5 clusters
deno run --allow-read --allow-write jsr:@aidevtool/traceability-ids ./data \
  --algorithm kmeans --k 5 --format json

# DBSCAN clustering
deno run --allow-read --allow-write jsr:@aidevtool/traceability-ids ./data \
  --algorithm dbscan --epsilon 0.3 --min-points 2

# Different output formats
deno run --allow-read --allow-write jsr:@aidevtool/traceability-ids ./data --format json
deno run --allow-read --allow-write jsr:@aidevtool/traceability-ids ./data --format markdown
deno run --allow-read --allow-write jsr:@aidevtool/traceability-ids ./data --format csv
```

### Search Mode

Use the `/search` subpath for similarity search:

```bash
# Output to STDOUT
deno run --allow-read --allow-write jsr:@aidevtool/traceability-ids/search \
  --query "security" --top 10 ./docs

# Output to file with distance scores
deno run --allow-read --allow-write jsr:@aidevtool/traceability-ids/search \
  ./docs --query "security" --output result.txt --show-distance

# Find IDs similar to a specific ID
deno run --allow-read --allow-write jsr:@aidevtool/traceability-ids/search \
  --query "req:apikey:security-4f7b2e#20251111a" --top 20 ./data

# Options can be in any order
deno run --allow-read --allow-write jsr:@aidevtool/traceability-ids/search \
  --top 5 --query "auth" ./data --distance cosine
```

### Extract Mode

Use the `/extract` subpath to extract context around specific IDs:

```bash
# Output to STDOUT
deno run --allow-read --allow-write jsr:@aidevtool/traceability-ids/extract \
  --ids "req:apikey:security-4f7b2e#20251111a" ./docs

# Output to file
deno run --allow-read --allow-write jsr:@aidevtool/traceability-ids/extract \
  ./docs --ids "req:apikey:security-4f7b2e#20251111a" --output context.md

# Extract from ID list file
deno run --allow-read --allow-write jsr:@aidevtool/traceability-ids/extract \
  --ids-file ./ids.txt ./docs --before 5 --after 15

# Custom context range and format
deno run --allow-read --allow-write jsr:@aidevtool/traceability-ids/extract \
  --before 5 ./data --ids "req:test:id-abc#v1" --format json

# ID without version: newest version (default) or every version
deno run --allow-read --allow-write jsr:@aidevtool/traceability-ids/extract \
  --ids "req:apikey:security-4f7b2e" ./docs
deno run --allow-read --allow-write jsr:@aidevtool/traceability-ids/extract \
  --ids "req:apikey:security-4f7b2e" --versions all ./docs

# Scan specs and source code together
deno run --allow-read --allow-write jsr:@aidevtool/traceability-ids/extract \
  --ids "req:apikey:security-4f7b2e" --ext md,rs,ts .specs src src-tauri/src
```

### Graph Mode

Use the `/graph` subpath to generate an interactive 3D visualization:

```bash
# Basic usage (force-directed layout)
deno run --allow-read --allow-write jsr:@aidevtool/traceability-ids/graph ./data

# Output to custom path
deno run --allow-read --allow-write jsr:@aidevtool/traceability-ids/graph \
  ./data --output tmp/my-graph.html

# MDS layout with scope-based coloring
deno run --allow-read --allow-write jsr:@aidevtool/traceability-ids/graph \
  ./data --layout mds --color-by scope

# Custom thresholds
deno run --allow-read --allow-write jsr:@aidevtool/traceability-ids/graph \
  ./data --threshold 0.5 --edge-threshold 0.7

# DBSCAN clustering
deno run --allow-read --allow-write jsr:@aidevtool/traceability-ids/graph \
  ./data --algorithm dbscan --epsilon 0.4

# Relations from the body only; exit 0 even with broken links
deno run --allow-read --allow-write jsr:@aidevtool/traceability-ids/graph \
  ./docs --skip-frontmatter --allow-missing
```

Besides similarity edges, the graph draws the relations each item declares:

```yaml
traceability:
  - id:
      full: req:apikey:persistence-2f8d5b#20251111a
    derived_from: # 派生元
      - req:apikey:data-mgmt-6c9e4a#20251111a
    trace_to: # 追跡先（参照先）
      - dsg:apikey:storage-schema-1a2b3c
```

- Only the referencing item writes the relation; the source of an arrow is the item's own `id`
  (`id: <ID>` or `id:` / `full: <ID>`). Relations with no own ID are skipped with a warning.
- Relations are read from the frontmatter and fenced `yaml` blocks; `--skip-frontmatter`
  limits them to the blocks.
- A target without a version follows `--versions` (newest version by default).
- A target that appears nowhere except in relation values is a broken link: it is reported
  and the exit code is 1 (`--allow-missing` → 0).

See [docs/trace-relations.md](docs/trace-relations.md) for the full definition.

### Relations Mode

Use the `/relations` subpath to get declared relations as data:

```bash
# Who refers to an ID (one row per declaration)
deno run --allow-read jsr:@aidevtool/traceability-ids/relations \
  --ids req:auth:login-flow-1a2b3c --direction in ./docs
# → docs/b.md:6: req:auth:session-timeout-4d5e6f#20260201 -derived_from-> req:auth:login-flow-1a2b3c

# What an ID depends on, as TSV (direction, kind, source, target, file:line, reason)
deno run --allow-read jsr:@aidevtool/traceability-ids/relations \
  --ids req:auth:session-timeout-4d5e6f --direction out --format tsv ./docs

# Broken relations, with the reason
deno run --allow-read jsr:@aidevtool/traceability-ids/relations --broken ./docs
# → docs/b.md:8: … -trace_to-> req:auth:login-flow-1a2b3c#20251201 (version not found: node exists with 20260101, no version)
# → docs/b.md:9: … -trace_to-> req:auth:missing-node-000000 (node not found)
```

- Without `--ids`, every declaration is output. `--direction` requires `--ids`.
- By default only declarations whose target is found are output; `--broken` outputs only
  the others.
- A requested ID that is neither an item nor a declared target is not found: exit 1
  (`--allow-missing` → 0).

### List Mode

Use the `/list` subpath to extract all IDs with occurrence information:

```bash
# JSON output to stdout (default)
deno run --allow-read jsr:@aidevtool/traceability-ids/list ./data

# Write to file
deno run --allow-read --allow-write jsr:@aidevtool/traceability-ids/list \
  ./data --output tmp/id-index.json

# Simple unique ID list
deno run --allow-read jsr:@aidevtool/traceability-ids/list \
  ./data --format simple

# Sort by scope, CSV format
deno run --allow-read --allow-write jsr:@aidevtool/traceability-ids/list \
  ./data --format csv --sort scope --output tmp/ids.csv

# Batch split (100 IDs per file)
deno run --allow-read --allow-write jsr:@aidevtool/traceability-ids/list \
  ./data --output tmp/ids.json --batch-size 100

# Where one ID occurs, every version: "{count} {filePath}" per file
deno run --allow-read jsr:@aidevtool/traceability-ids/list \
  --ids req:auth:login-flow-1a2b3c --versions all --format locations ./docs
# → 1 docs/a.md
# → 4 docs/b.md

# Occurrences per ID: "{count} {fullId}"
deno run --allow-read jsr:@aidevtool/traceability-ids/list \
  --ids req:auth:login-flow-1a2b3c --format count ./docs
```

`locations` adds up the occurrences of every selected ID per file (like `grep -c`);
use `count` for counts per ID. A requested ID that is not found makes the exit code 1.

### Analyze Mode

Use the `/analyze` subpath to generate a document improvement report:

```bash
# Basic usage
deno run --allow-read --allow-write jsr:@aidevtool/traceability-ids/analyze ./data

# Custom output path
deno run --allow-read --allow-write jsr:@aidevtool/traceability-ids/analyze \
  ./data --output tmp/report.md

# Fine-grained clustering for analysis
deno run --allow-read --allow-write jsr:@aidevtool/traceability-ids/analyze \
  ./data --threshold 0.2
```

The report analyzes 4 dimensions:

1. **Structure** - Level x Scope coverage matrix and traceability chain completeness
2. **Detail** - Specification expansion rate and version freshness
3. **Duplication** - Near-duplicate detection and cross-file duplication
4. **Gaps** - Missing levels, isolated scopes, and low-connectivity nodes

## Options

### Common Options (all modes)

| Option               | Description                                                        | Default                         | Values                     |
| -------------------- | ------------------------------------------------------------------ | ------------------------------- | -------------------------- |
| `<input-path...>`    | Directories or files to scan (one or more, dirs recursively)       | -                               | Paths (e.g. `.specs src`)  |
| `--ext`              | File extensions to scan, comma-separated                           | `md`                            | e.g. `md,rs,ts,tsx,mjs,sh` |
| `--skip-frontmatter` | Read the body only, ignoring the frontmatter (leading `---` block) | `false`                         | Boolean                    |
| `--hash-pattern`     | Hash form of the last segment (regular expression, matched whole)  | `(?=[a-z0-9]*[0-9])[a-z0-9]{6}` | e.g. `[0-9a-f]{6}`         |
| `--require-hash`     | Exclude IDs without a hash                                         | `false`                         | Boolean                    |

An option a command does not accept is an `UnknownOption` error (exit code 2). `-h` is
`--help`.

A path that does not exist is a `PathNotFound` error (exit code 3) naming that path. Files given
explicitly are scanned regardless of `--ext`.

Frontmatter is a block at the very start of a file that opens with a `---` line and
closes with the next `---` or `...` line (an unclosed block is not frontmatter).
With `--skip-frontmatter`, IDs (and, in graph mode, relations) inside it are not
extracted; line numbers of body IDs stay those of the original file.

### Cluster Mode Options

| Option         | Description                    | Default        | Values                                                  |
| -------------- | ------------------------------ | -------------- | ------------------------------------------------------- |
| `--output`     | Output file path               | STDOUT         | File path                                               |
| `--distance`   | Distance calculation method    | `structural`   | `levenshtein`, `jaro-winkler`, `cosine`, `structural`   |
| `--format`     | Output format                  | `simple`       | `simple`, `simple-clustered`, `json`, `markdown`, `csv` |
| `--algorithm`  | Clustering algorithm           | `hierarchical` | `hierarchical`, `kmeans`, `dbscan`                      |
| `--threshold`  | Threshold for hierarchical     | `0.3`          | Number                                                  |
| `--k`          | Number of clusters for K-Means | `0`            | Number (0=auto)                                         |
| `--epsilon`    | Neighborhood radius for DBSCAN | `0.3`          | Number                                                  |
| `--min-points` | Minimum points for DBSCAN      | `2`            | Number                                                  |
| `--help`       | Show help message              | -              | -                                                       |

### Search Mode Options (`/search`)

| Option            | Description               | Default  | Values                                                |
| ----------------- | ------------------------- | -------- | ----------------------------------------------------- |
| `--query`         | Search query (REQUIRED)   | -        | String                                                |
| `--output`        | Output file path          | STDOUT   | File path                                             |
| `--distance`      | Distance calculation      | `cosine` | `levenshtein`, `jaro-winkler`, `cosine`, `structural` |
| `--top`           | Return only top N results | all      | Number                                                |
| `--show-distance` | Include distance scores   | `false`  | Boolean                                               |
| `--format`        | Output format             | `simple` | `simple`, `json`, `markdown`, `csv`                   |

The `simple` format prints only IDs, one per line (`{id}\t{distance}` with
`--show-distance`), so `| head -1` or `| xargs` get an ID. The query and the number of
results are reported on STDERR.

### Extract Mode Options (`/extract`)

| Option            | Description                             | Default    | Values                       |
| ----------------- | --------------------------------------- | ---------- | ---------------------------- |
| `--ids`           | Space-separated IDs (REQUIRED)          | -          | String                       |
| `--ids-file`      | Path to file with IDs                   | -          | File path                    |
| `--output`        | Output file path                        | STDOUT     | File path                    |
| `--before`        | Lines before target                     | `3`        | Number (max: 50)             |
| `--after`         | Lines after target                      | `10`       | Number (max: 50)             |
| `--format`        | Output format                           | `markdown` | `markdown`, `json`, `simple` |
| `--versions`      | Resolution of IDs without version       | `latest`   | `latest`, `all`              |
| `--allow-missing` | Exit 0 even when some IDs are not found | `false`    | Boolean                      |

`--ids` accepts IDs with or without a version. With a version
(`req:apikey:security-4f7b2e#20251111a`) the match is exact. Without a version
(`req:apikey:security-4f7b2e`) it matches the newest version (`latest`) or every
version, newest first (`all`). Versions are compared with digit runs as numbers.

### Graph Mode Options (`/graph`)

| Option             | Description                                    | Default             | Values                                                |
| ------------------ | ---------------------------------------------- | ------------------- | ----------------------------------------------------- |
| `--output`         | Output HTML file path                          | `tmp/graph-3d.html` | File path                                             |
| `--distance`       | Distance calculation method                    | `structural`        | `levenshtein`, `jaro-winkler`, `cosine`, `structural` |
| `--algorithm`      | Clustering algorithm                           | `hierarchical`      | `hierarchical`, `kmeans`, `dbscan`                    |
| `--threshold`      | Clustering threshold                           | `0.3`               | Number                                                |
| `--edge-threshold` | Edge display threshold                         | `0.5`               | Number (0-1)                                          |
| `--color-by`       | Node coloring mode                             | `cluster`           | `cluster`, `scope`, `level`                           |
| `--layout`         | Graph layout algorithm                         | `force`             | `force`, `mds`                                        |
| `--k`              | K-Means cluster count                          | `0` (auto)          | Number                                                |
| `--epsilon`        | DBSCAN neighborhood radius                     | `0.3`               | Number                                                |
| `--min-points`     | DBSCAN minimum neighbors                       | `2`                 | Number                                                |
| `--versions`       | Resolution of relation targets without version | `latest`            | `latest`, `all`                                       |
| `--allow-missing`  | Exit 0 even with broken relation links         | `false`             | Boolean                                               |

### Relations Mode Options (`/relations`)

| Option            | Description                                         | Default  | Values                     |
| ----------------- | --------------------------------------------------- | -------- | -------------------------- |
| `--ids`           | Only relations touching these IDs (space-separated) | all      | String                     |
| `--ids-file`      | Path to file with IDs                               | -        | File path                  |
| `--direction`     | Seen from `--ids` (requires `--ids`)                | `both`   | `in`, `out`, `both`        |
| `--kind`          | Relation fields (repeatable or comma-separated)     | all      | `derived_from`, `trace_to` |
| `--broken`        | Only relations whose target is not found            | `false`  | Boolean                    |
| `--format`        | Output format                                       | `simple` | `simple`, `tsv`, `json`    |
| `--output`        | Output file path                                    | STDOUT   | File path                  |
| `--versions`      | Resolution of IDs and targets without version       | `latest` | `latest`, `all`            |
| `--allow-missing` | Exit 0 even when some IDs are not found             | `false`  | Boolean                    |

### List Mode Options (`/list`)

| Option            | Description                             | Default  | Values                                        |
| ----------------- | --------------------------------------- | -------- | --------------------------------------------- |
| `--output`        | Output file path                        | STDOUT   | File path                                     |
| `--format`        | Output format                           | `json`   | `json`, `simple`, `csv`, `locations`, `count` |
| `--sort`          | Sort order                              | `fullId` | `fullId`, `scope`, `level`, `count`           |
| `--batch-size`    | IDs per batch file                      | `0`      | Number (0 = no split)                         |
| `--ids`           | Only these IDs (space-separated)        | all      | String                                        |
| `--ids-file`      | Path to file with IDs                   | -        | File path                                     |
| `--versions`      | Resolution of IDs without version       | `latest` | `latest`, `all`                               |
| `--allow-missing` | Exit 0 even when some IDs are not found | `false`  | Boolean                                       |

### Analyze Mode Options (`/analyze`)

| Option             | Description                     | Default                 | Values                                                |
| ------------------ | ------------------------------- | ----------------------- | ----------------------------------------------------- |
| `--output`         | Output report file path         | `tmp/analyze-report.md` | File path                                             |
| `--distance`       | Distance calculation method     | `structural`            | `levenshtein`, `jaro-winkler`, `cosine`, `structural` |
| `--algorithm`      | Clustering algorithm            | `hierarchical`          | `hierarchical`, `kmeans`, `dbscan`                    |
| `--threshold`      | Clustering threshold            | `0.3`                   | Number                                                |
| `--edge-threshold` | Connectivity analysis threshold | `0.5`                   | Number                                                |
| `--k`              | K-Means cluster count           | `0` (auto)              | Number                                                |
| `--epsilon`        | DBSCAN neighborhood radius      | `0.3`                   | Number                                                |
| `--min-points`     | DBSCAN minimum neighbors        | `2`                     | Number                                                |

## Errors and Exit Codes

Exit codes follow the `grep` / `diff` convention: 0 and 1 are results, 2 and
above are failures. Every failure is a `TraceabilityError` with a typed
`detail.kind`; the CLI prints `Error [<kind>]: <message>` to STDERR and exits with
the code of the kind's category.

| Exit | Meaning    | Details                                                                                                                       |
| ---- | ---------- | ----------------------------------------------------------------------------------------------------------------------------- |
| 0    | complete   | Success (everything requested was found)                                                                                      |
| 1    | partial    | `/extract`, `/list`, `/relations`: some requested IDs were not found; `/graph`: broken relation links (`--allow-missing` → 0) |
| 2    | usage      | `MissingArgument`, `EmptyIdList`, `UnknownOption`, `InvalidOptionValue`, `InvalidParameter`                                   |
| 3    | input      | `PathNotFound`, `PathAccessDenied`, `ScanFailed`, `FileReadFailed`                                                            |
| 4    | output     | `FileWriteFailed`                                                                                                             |
| 5    | external   | `ExternalCommandFailed`                                                                                                       |
| 70   | unexpected | Anything that is not a `TraceabilityError` (sysexits EX_SOFTWARE)                                                             |

With exit 1, the found IDs are still printed. Modes return a `ModeOutcome`
(`{ status: "complete" }` or `{ status: "partial", missing }`).

```ts
import { isTraceabilityError, runExtractMode } from "jsr:@aidevtool/traceability-ids/mod";

try {
  await runExtractMode({
    inputDir: [".specs", "src"],
    extensions: ["md", "rs"],
    ids: { kind: "inline", text: "req:auth:login-a1b2c3" },
    before: 3,
    after: 10,
    format: "json",
    versions: "latest",
  });
} catch (e) {
  if (isTraceabilityError(e, "PathNotFound")) console.error(`missing: ${e.detail.path}`);
}
```

Modes report progress as typed `ModeEvent`s through an injectable `ModeIO`
(default: progress to STDERR, results to STDOUT).

## Testing

```bash
deno task check   # fmt + lint + tests
```

Mode behavior is tested as typed scenarios (`src/testing/scenario.ts`): files
that exist (`given`), an action (`when`), and events expected **in order**, events
that must not occur, and the outcome (`then`). `ExpectedEvent` only accepts real
event types with a subset of their fields, so an impossible step does not compile.

```ts
defineScenario({
  name: "extract: a missing path fails after the scan starts",
  given: { "docs/a.md": "req:a:b-1f#v1" },
  when: (ctx) =>
    runExtractMode({ ...options, inputDir: [ctx.path("docs"), ctx.path("publish")] }, ctx.io),
  then: {
    events: [{ type: "TargetsLoaded" }, { type: "ScanStarted" }],
    absent: ["FilesScanned"],
    outcome: { kind: "error", error: { kind: "PathNotFound" } },
  },
});
```

## Distance Calculation Guide

Choose the appropriate distance calculator for your use case:

### Structural Distance (Default, Recommended for Scope Grouping)

**Best when you want to group IDs by scope**

```bash
deno run --allow-read --allow-write jsr:@aidevtool/traceability-ids ./data
```

- Recognizes ID structure: `{level}:{scope}:{semantic}-{hash}#{version}`
- Applies weights to components (scope: 0.3, semantic: 0.3)
- Clearly distinguishes `req:apikey:xxx` from `req:dashboard:xxx`
- **Pros**: Clean grouping by scope
- **Cons**: Depends on ID format

### Levenshtein Distance

**Compares strings by edit distance**

```bash
deno run --allow-read --allow-write jsr:@aidevtool/traceability-ids ./data \
  --distance levenshtein
```

- Compares entire string character by character
- Does not consider ID structure
- **Pros**: Simple and general-purpose
- **Cons**: May split same-scope IDs when using hierarchical clustering
  (chaining effect)

### Jaro-Winkler Distance

**Emphasizes prefix matching**

```bash
deno run --allow-read --allow-write jsr:@aidevtool/traceability-ids ./data \
  --distance jaro-winkler
```

- Emphasizes matching at the beginning (level, scope)
- **Pros**: Groups IDs with same prefix
- **Cons**: De-emphasizes differences in semantic component

### Cosine Similarity

**N-gram based similarity**

```bash
deno run --allow-read --allow-write jsr:@aidevtool/traceability-ids ./data \
  --distance cosine
```

- Breaks strings into N-grams (default 2 characters) and vectorizes
- **Pros**: Evaluates common substrings
- **Cons**: Emphasizes partial matches over exact matches

### Recommended Combinations

| Purpose               | Distance      | Algorithm      | Options                        |
| --------------------- | ------------- | -------------- | ------------------------------ |
| Group by scope        | `structural`  | `hierarchical` | (default)                      |
| General clustering    | `levenshtein` | `hierarchical` | `--threshold 0.5`              |
| Specify cluster count | any           | `kmeans`       | `--k 5`                        |
| Remove noise          | any           | `dbscan`       | `--epsilon 0.3 --min-points 2` |

## Help

For detailed help, run:

```bash
deno run --allow-read --allow-write jsr:@aidevtool/traceability-ids --help
```

## Project Structure

```
.
├── README.md                # This file
├── LICENSE                  # MIT License
├── deno.json                # Deno configuration
├── jsr.json                 # JSR publication config
├── search.ts                # Search mode entry point
├── extract.ts               # Extract mode entry point
├── graph.ts                 # Graph mode entry point
├── analyze.ts               # Analyze mode entry point
├── list.ts                  # List mode entry point
├── relations.ts             # Relations mode entry point
├── data/                    # Sample data
├── docs/                    # Documentation
│   ├── requirements.md      # Requirements
│   ├── architecture.md      # Architecture design
│   ├── graph-visualization.md  # Graph mode design
│   ├── trace-relations.md   # derived_from / trace_to definition
│   ├── analyze-report.md    # Analyze mode design
│   └── list-mode.md         # List mode design
├── tmp/                     # Output directory (gitignored)
└── src/                     # Source code
    ├── cli/                 # CLI layer
    │   ├── args.ts          # Pure argument parsers → typed mode options
    │   ├── runner.ts        # Help, run, error → exit code
    │   ├── help.ts          # Help text of shared options
    │   ├── issues.test.ts   # Acceptance tests of issues, run as CLI commands
    │   └── *-factory.ts     # Distance / clustering factories
    ├── core/                # Core functionality
    │   ├── types.ts         # Result type definitions
    │   ├── id.ts            # ID grammar (single definition)
    │   ├── options.ts       # Option vocabularies and parsers
    │   ├── errors.ts        # TraceabilityError, error kinds, exit codes
    │   ├── events.ts        # ModeEvent / ModeIO (progress reporting)
    │   ├── io.ts            # File I/O with typed errors
    │   ├── scanner.ts       # File scanner (paths, extensions)
    │   ├── relations.ts     # Relation kinds, declarations, issues
    │   └── extractor.ts     # ID extractor
    ├── relations/           # derived_from / trace_to
    │   ├── extract.ts       # Read declarations from YAML regions
    │   ├── resolve.ts       # Resolve targets, broken links and their reasons
    │   └── select.ts        # Select declarations by IDs and direction
    ├── distance/            # Distance calculation
    │   ├── calculator.ts    # Interface & matrix creation
    │   ├── levenshtein.ts   # Levenshtein distance
    │   ├── jaro_winkler.ts  # Jaro-Winkler distance
    │   ├── cosine.ts        # Cosine similarity
    │   └── structural.ts    # Structural distance
    ├── clustering/          # Clustering algorithms
    │   ├── algorithm.ts     # Interface
    │   ├── hierarchical.ts  # Hierarchical clustering
    │   ├── kmeans.ts        # K-Means clustering
    │   └── dbscan.ts        # DBSCAN clustering
    ├── search/              # Similarity search
    │   └── similarity.ts    # Search functions
    ├── list/                # ID listing/indexing
    │   └── aggregator.ts    # Occurrence aggregation
    ├── extract/             # Context extraction
    │   ├── context.ts       # Context extraction logic
    │   ├── resolver.ts      # Requested ID → matching versions
    │   └── loader.ts        # IdsSource (inline / file) loading
    ├── visualization/       # 3D graph visualization
    │   ├── mds.ts           # Classical MDS algorithm
    │   ├── graph_data.ts    # Graph data transformation
    │   └── html_template.ts # HTML generation
    ├── modes/               # Mode orchestration
    │   ├── pipeline.ts      # Shared scan → extract → emit steps
    │   ├── cluster.ts       # Cluster mode
    │   ├── search.ts        # Search mode
    │   ├── extract.ts       # Extract mode
    │   ├── graph.ts         # Graph mode
    │   ├── analyze.ts       # Analyze mode
    │   ├── list.ts          # List mode
    │   └── relations.ts     # Relations mode
    ├── formatter/           # Output formatters
    │   ├── formatter.ts     # JSON/Markdown/CSV formatters
    │   ├── list_formatter.ts # List mode formatters
    │   └── relations_formatter.ts # Relations mode formatters
    ├── testing/             # Typed scenario test support (not published)
    │   └── scenario.ts      # given / when / then with event order
    ├── cli.ts               # CLI entry point (cluster mode)
    └── mod.ts               # Library entry point (`/mod` export)
```

## Tech Stack

- **Runtime**: Deno (latest)
- **Language**: Pure TypeScript
- **Dependencies**: None (standard library only)

## License

MIT License - see [LICENSE](LICENSE) file for details.

## Contributing

Contributions are welcome! Please feel free to submit issues and pull requests.

## Links

- [JSR Package](https://jsr.io/@aidevtool/traceability-ids)
- [GitHub Repository](https://github.com/tettuan/traceability-ids)
