# traceability-ids

A CLI tool for extracting and clustering traceability IDs from markdown files based on similarity.

[![JSR](https://jsr.io/badges/@aidevtool/traceability-ids)](https://jsr.io/@aidevtool/traceability-ids)
[![JSR Score](https://jsr.io/badges/@aidevtool/traceability-ids/score)](https://jsr.io/@aidevtool/traceability-ids)

## Overview

This tool automatically extracts traceability IDs from Markdown files and clusters them based on string similarity. Implemented in pure TypeScript with support for multiple clustering algorithms and distance calculation methods.

### Purpose

While `grep` can easily find traceability IDs in files, **discovering the location of similar IDs** is difficult.

This tool extracts IDs and clusters them by similarity, outputting a **unique ID list sorted by similarity**. This enables:

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
deno install --allow-read --allow-write jsr:@aidevtool/traceability-ids/cli
```

Or run directly without installation:

```bash
deno run --allow-read --allow-write jsr:@aidevtool/traceability-ids/cli <input-dir> <output-file> [options]
```

## Usage

### Basic Usage (Recommended)

```bash
# Output simple ID list (default)
deno run --allow-read --allow-write jsr:@aidevtool/traceability-ids/cli ./data ./output/ids.txt

# Example output:
# req:apikey:hierarchy-9a2f4d#20251111a
# req:apikey:vendor-mgmt-3b7e5c#20251111a
# req:dashboard:login-display-a1b2c3#20251111
# ...
```

### Cluster Mode

#### Simple ID List with Cluster Boundaries

```bash
# IDs grouped by cluster
deno run --allow-read --allow-write jsr:@aidevtool/traceability-ids/cli ./data ./output/ids.txt \
  --format simple-clustered

# Example output:
# # Cluster 1 (15 unique IDs)
# req:apikey:hierarchy-9a2f4d#20251111a
# req:apikey:vendor-mgmt-3b7e5c#20251111a
# ...
#
# # Cluster 2 (8 unique IDs)
# req:dashboard:login-display-a1b2c3#20251111
# ...
```

#### Scope-based Grouping (Recommended)

```bash
# Group IDs by scope using structural distance
deno run --allow-read --allow-write jsr:@aidevtool/traceability-ids/cli ./data ./output/ids.txt \
  --distance structural --threshold 0.3
```

#### Different Clustering Algorithms

```bash
# K-Means clustering with 5 clusters
deno run --allow-read --allow-write jsr:@aidevtool/traceability-ids/cli ./data ./output/ids.txt \
  --algorithm kmeans --k 5

# Density-based clustering (DBSCAN)
deno run --allow-read --allow-write jsr:@aidevtool/traceability-ids/cli ./data ./output/ids.txt \
  --algorithm dbscan --epsilon 0.3 --min-points 2
```

#### Different Output Formats

```bash
# JSON format (full structured data)
deno run --allow-read --allow-write jsr:@aidevtool/traceability-ids/cli ./data ./output/clusters.json \
  --format json

# Markdown format (human-readable)
deno run --allow-read --allow-write jsr:@aidevtool/traceability-ids/cli ./data ./output/clusters.md \
  --format markdown

# CSV format (spreadsheet compatible)
deno run --allow-read --allow-write jsr:@aidevtool/traceability-ids/cli ./data ./output/clusters.csv \
  --format csv
```

### Search Mode

Find IDs similar to a specific query:

```bash
# Find top 10 IDs similar to "security"
deno run --allow-read --allow-write jsr:@aidevtool/traceability-ids/cli ./data ./output/security.txt \
  --mode search --query "security" --top 10

# Search with similarity scores
deno run --allow-read --allow-write jsr:@aidevtool/traceability-ids/cli ./data ./output/security.txt \
  --mode search --query "security" --show-distance

# Find IDs similar to a specific ID
deno run --allow-read --allow-write jsr:@aidevtool/traceability-ids/cli ./data ./output/similar.txt \
  --mode search --query "req:apikey:security-4f7b2e#20251111a"

# Structural search (better for finding same-scope IDs)
deno run --allow-read --allow-write jsr:@aidevtool/traceability-ids/cli ./data ./output/similar.txt \
  --mode search --query "encryption" --distance structural --top 20
```

## Options

### Global Options

| Option | Description | Default | Values |
|--------|-------------|---------|--------|
| `--mode` | Execution mode | `cluster` | `cluster`, `search` |
| `--distance` | Distance calculation method | `levenshtein` | `levenshtein`, `jaro-winkler`, `cosine`, `structural` |
| `--format` | Output format | `simple` | `simple`, `simple-clustered`, `json`, `markdown`, `csv` |
| `--help` | Show help message | - | - |

### Clustering Mode Options

| Option | Description | Default | Values |
|--------|-------------|---------|--------|
| `--algorithm` | Clustering algorithm | `hierarchical` | `hierarchical`, `kmeans`, `dbscan` |
| `--threshold` | Threshold for hierarchical | `10` | Number (edit distance) |
| `--k` | Number of clusters for K-Means | `0` | Number (0=auto) |
| `--epsilon` | Neighborhood radius for DBSCAN | `0.3` | Number |
| `--min-points` | Minimum points for DBSCAN | `2` | Number |

### Search Mode Options

| Option | Description | Default | Values |
|--------|-------------|---------|--------|
| `--query` | Search query (REQUIRED) | - | String |
| `--top` | Return only top N results | all | Number |
| `--show-distance` | Include distance scores | `false` | Boolean |

## Distance Calculation Guide

Choose the appropriate distance calculator for your use case:

### Structural Distance (Recommended for Scope Grouping)

**Best when you want to group IDs by scope**

```bash
deno run --allow-read --allow-write jsr:@aidevtool/traceability-ids/cli ./data ./output/ids.txt \
  --distance structural --threshold 0.3
```

- Recognizes ID structure: `{level}:{scope}:{semantic}-{hash}#{version}`
- Applies weights to components (scope: 0.3, semantic: 0.3)
- Clearly distinguishes `req:apikey:xxx` from `req:dashboard:xxx`
- **Pros**: Clean grouping by scope
- **Cons**: Depends on ID format

### Levenshtein Distance (Default)

**Compares strings by edit distance**

```bash
deno run --allow-read --allow-write jsr:@aidevtool/traceability-ids/cli ./data ./output/ids.txt
```

- Compares entire string character by character
- Does not consider ID structure
- **Pros**: Simple and general-purpose
- **Cons**: May split same-scope IDs when using hierarchical clustering (chaining effect)

### Jaro-Winkler Distance

**Emphasizes prefix matching**

```bash
deno run --allow-read --allow-write jsr:@aidevtool/traceability-ids/cli ./data ./output/ids.txt \
  --distance jaro-winkler
```

- Emphasizes matching at the beginning (level, scope)
- **Pros**: Groups IDs with same prefix
- **Cons**: De-emphasizes differences in semantic component

### Cosine Similarity

**N-gram based similarity**

```bash
deno run --allow-read --allow-write jsr:@aidevtool/traceability-ids/cli ./data ./output/ids.txt \
  --distance cosine
```

- Breaks strings into N-grams (default 2 characters) and vectorizes
- **Pros**: Evaluates common substrings
- **Cons**: Emphasizes partial matches over exact matches

### Recommended Combinations

| Purpose | Distance | Algorithm | Options |
|---------|----------|-----------|---------|
| Group by scope | `structural` | `hierarchical` | `--threshold 0.3` |
| General clustering | `levenshtein` | `hierarchical` | `--threshold 10` |
| Specify cluster count | any | `kmeans` | `--k 5` |
| Remove noise | any | `dbscan` | `--epsilon 0.3 --min-points 2` |

## Help

For detailed help, run:

```bash
deno run --allow-read --allow-write jsr:@aidevtool/traceability-ids/cli --help
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
