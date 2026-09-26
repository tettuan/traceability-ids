# List Mode Design

## Overview

The `list` mode extracts all traceability IDs from the input files (markdown by
default; other extensions via `--ext`) and outputs a structured index with occurrence information. Unlike other modes, it focuses on
**complete enumeration** rather than clustering or searching.

## Data Flow

```mermaid
flowchart LR
    A["input-path... + --ext"] --> B[scanFiles]
    B --> C[extractIds]
    C --> D["rawIds (all occurrences)"]
    D --> E[aggregateOccurrences]
    E --> F[IdIndex]
    F --> G{batch?}
    G -->|N| H[formatListResult]
    G -->|Y| I[splitBatches]
    I --> J["formatListResult × N"]
    H --> K[output]
    J --> K
```

Input is one or more paths. Directories are scanned recursively for files with
the selected extensions (default `md`); files given explicitly are always
included regardless of extension. A path that does not exist fails with
`PathNotFound` (exit code 3).

Scanning and extraction run through the shared `collectIds` step
(`src/modes/pipeline.ts`) with `EmptyPolicy = "continue"`, so list mode does not
stop when nothing is found (see [Empty Input](#empty-input)).

## Output Structure

### IdIndex (JSON)

```json
{
  "totalUniqueIds": 851,
  "totalOccurrences": 2864,
  "entries": [
    {
      "fullId": "req:apikey:security-4f7b2e#20251111a",
      "level": "req",
      "scope": "apikey",
      "semantic": "security",
      "hash": "4f7b2e",
      "version": "20251111a",
      "occurrences": [
        { "filePath": "/docs/requirements.md", "lineNumber": 42 },
        { "filePath": "/docs/spec.md", "lineNumber": 15 }
      ]
    }
  ]
}
```

### Simple

One unique fullId per line (alphabetical). IDs written without a version
(`{level}:{scope}:{semantic}-{hash}`) are listed as their own entries with an
empty `version`:

```
dsg:api:contracts-g7h8i9#20260129
dsg:data:flow-d4e5f6#20260129
req:apikey:security-4f7b2e#20251111a
```

### CSV

One row per occurrence:

```csv
FullId,Level,Scope,Semantic,Hash,Version,OccurrenceCount,FilePath,LineNumber
"req:apikey:security-4f7b2e#20251111a","req","apikey","security","4f7b2e","20251111a",2,"/docs/req.md",42
"req:apikey:security-4f7b2e#20251111a","req","apikey","security","4f7b2e","20251111a",2,"/docs/spec.md",15
```

## Sort Options

| Key      | Description                       |
| -------- | --------------------------------- |
| `fullId` | Alphabetical by full ID (default) |
| `scope`  | Group by scope, then alphabetical |
| `level`  | Group by level, then alphabetical |
| `count`  | Most occurrences first            |

## Batch Splitting

When `--batch-size N` is specified with `--output`, the output is split into
multiple files:

```
--output tmp/ids.json --batch-size 100
→ tmp/ids-001.json (entries 1-100)
→ tmp/ids-002.json (entries 101-200)
→ ...
```

Each batch file has the same `IdIndex` structure with `totalUniqueIds` and
`totalOccurrences` reflecting only that batch's entries.

## Empty Input

Unlike the other modes, which stop with `Stopped(NoFiles)` / `Stopped(NoIds)`
and produce no output, list mode always outputs an index. When no files or no
IDs are found, the result is an empty index
(`{"totalUniqueIds": 0, "totalOccurrences": 0, "entries": []}` in JSON, an empty
list in simple / CSV). With `--batch-size`, an empty index produces no batch
files.

## Progress and Output Streams

Progress is reported as typed `ModeEvent`s through the injected `ModeIO`
(`consoleIO` by default), which prints progress lines to **STDERR** and the
result to **STDOUT**. Piping stdout (e.g. `list.ts ./docs | jq`) therefore
receives only the index.

Event order: `ModeStarted → ScanStarted → FilesScanned → IdsExtracted →
OutputWritten | OutputPrinted` (one output event per batch file).

## Module Structure

| Module                            | Responsibility                                               |
| --------------------------------- | ------------------------------------------------------------ |
| `src/list/aggregator.ts`          | Group rawIds by fullId, sort, batch split                    |
| `src/formatter/list_formatter.ts` | Format IdIndex as JSON/simple/CSV                            |
| `src/modes/pipeline.ts`           | Shared scan/extract (`collectIds`) and output (`emitResult`) |
| `src/modes/list.ts`               | Orchestrate scan → extract → aggregate → format → output     |
| `src/cli/args.ts`                 | `parseListArgs`: argv → typed `ListModeOptions`              |
| `list.ts`                         | CLI entry point (usage + `CommandSpec`)                      |

## CLI Options

```
deno run --allow-read --allow-write list.ts [options] <input-path...>

--format <json|simple|csv>              Output format (default: json)
--output <file>                         Output file (default: stdout)
--sort <fullId|scope|level|count>       Sort order (default: fullId)
--batch-size <number>                   Entries per batch (default: 0 = no split, requires --output)
--ext <list>                            Extensions to scan, comma-separated (default: md)
```

Invalid values (e.g. `--sort name`, `--batch-size -1`) fail with
`InvalidOptionValue` (exit code 2); a missing input path fails with
`MissingArgument`.

## Comparison with Other Modes

| Feature             | list | cluster | extract                | analyze            |
| ------------------- | ---- | ------- | ---------------------- | ------------------ |
| All IDs             | yes  | yes     | no (--ids required)    | yes                |
| Occurrences grouped | yes  | no      | yes (per requested ID) | partial            |
| JSON output         | yes  | yes     | yes                    | no (Markdown only) |
| Batch splitting     | yes  | no      | no                     | no                 |
| Clustering          | no   | yes     | no                     | yes                |
| Context lines       | no   | no      | yes                    | no                 |
