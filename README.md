# traceability-ids

A CLI tool for extracting and clustering traceability IDs from markdown files
based on similarity.

[![JSR](https://jsr.io/badges/@aidevtool/traceability-ids)](https://jsr.io/@aidevtool/traceability-ids)
[![JSR Score](https://jsr.io/badges/@aidevtool/traceability-ids/score)](https://jsr.io/@aidevtool/traceability-ids)

## Overview

This tool automatically extracts traceability IDs from Markdown files and
clusters them based on string similarity. Implemented in pure TypeScript with
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

- **Pure TypeScript Implementation**
  - No external dependencies
  - Works with Deno
  - Designed for JSR publication

## Traceability ID Format

```
{level}:{scope}:{semantic}-{hash}#{version}
```

### Components

- `{level}`: String before the first colon
- `{scope}`: String between first and second colon
- `{semantic}`: String from second colon to hyphen
- `{hash}`: String from hyphen to hash symbol
- `{version}`: String after hash symbol

### Example

```
req:projA:auth-timeout-3kd92z#20250903a
```

## Installation

```bash
deno install --allow-read --allow-write jsr:@aidevtool/traceability-ids
```

Or run directly without installation:

```bash
deno run --allow-read --allow-write jsr:@aidevtool/traceability-ids [options] <input-dir>
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
```

## Options

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

### Extract Mode Options (`/extract`)

| Option       | Description                    | Default    | Values                      |
| ------------ | ------------------------------ | ---------- | --------------------------- |
| `--ids`      | Space-separated IDs (REQUIRED) | -          | String                      |
| `--ids-file` | Path to file with IDs          | -          | File path                   |
| `--output`   | Output file path               | STDOUT     | File path                   |
| `--before`   | Lines before target            | `3`        | Number (max: 50)            |
| `--after`    | Lines after target             | `10`       | Number (max: 50)            |
| `--format`   | Output format                  | `markdown` | `markdown`, `json`, `simple`|

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
├── data/                    # Sample data
├── docs/                    # Documentation
│   ├── requirements.md      # Requirements
│   └── architecture.md      # Architecture design
├── tmp/                     # Output directory (gitignored)
└── src/                     # Source code
    ├── core/                # Core functionality
    │   ├── types.ts         # Type definitions
    │   ├── scanner.ts       # File scanner
    │   └── extractor.ts     # ID extractor
    ├── distance/            # Distance calculation
    │   ├── calculator.ts    # Interface
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
    ├── formatter/           # Output formatters
    │   └── formatter.ts     # JSON/Markdown/CSV formatters
    ├── cli.ts               # CLI entry point
    └── mod.ts               # Library entry point
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
