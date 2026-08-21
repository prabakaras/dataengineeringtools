# Prabakar's GitHub Tools

A lightweight, browser-based toolbox for everyday data engineering, data analysis, and developer tasks. It is a static GitHub Pages site with no backend, accounts, or dependencies.

## Live Site

Open the toolkit at [prabakaras.github.io/dataengineeringtools](https://prabakaras.github.io/dataengineeringtools/).

## Why This Exists

Small data tasks often interrupt delivery work: formatting a payload, checking a CSV extract, comparing a SQL query, or creating safe records for a test environment. This project keeps those utilities in one public, fast-loading workspace. Every tool runs in the browser so it can be used without installing software or sharing working data with a service.

## Available Tools

| Tool | Purpose | Link |
| --- | --- | --- |
| JSON Formatter & Validator | Validate and format JSON with two-space indentation. | [Open tool](https://prabakaras.github.io/dataengineeringtools/json.html) |
| CSV / JSON Converter | Convert CSV to JSON or an array of JSON objects to CSV. | [Open tool](https://prabakaras.github.io/dataengineeringtools/convert.html) |
| SQL Formatter | Structure SQL queries and choose uppercase or lowercase keywords. | [Open tool](https://prabakaras.github.io/dataengineeringtools/sql.html) |
| CSV Data Profiler | Review rows, nulls, uniqueness, inferred types, and samples. | [Open tool](https://prabakaras.github.io/dataengineeringtools/profile.html) |
| Text Diff | Compare two text blocks line by line. | [Open tool](https://prabakaras.github.io/dataengineeringtools/diff.html) |
| Timestamp Converter | Convert epoch values, ISO dates, UTC, and local time. | [Open tool](https://prabakaras.github.io/dataengineeringtools/timestamp.html) |
| Regex Tester | Test JavaScript regular expressions and inspect matches. | [Open tool](https://prabakaras.github.io/dataengineeringtools/regex.html) |
| YAML Validator | Check common YAML indentation and mapping issues. | [Open tool](https://prabakaras.github.io/dataengineeringtools/yaml.html) |
| Data Quality Rules | Generate starter SQL for null, duplicate, range, and value checks. | [Open tool](https://prabakaras.github.io/dataengineeringtools/quality.html) |
| Data Masking | Mask common sensitive values before sharing text extracts. | [Open tool](https://prabakaras.github.io/dataengineeringtools/mask.html) |
| Cron Helper | Explain standard five-field cron expressions. | [Open tool](https://prabakaras.github.io/dataengineeringtools/cron.html) |
| Synthetic Data Generator | Generate test data from common DDL and export CSV, Excel-compatible data, or SQL inserts. | [Open tool](https://prabakaras.github.io/dataengineeringtools/synthetic.html) |
| JSON to Table | Flatten JSON records into a searchable table and export the results. | [Open tool](https://prabakaras.github.io/dataengineeringtools/json-table.html) |
| PII Scanner | Detect common sensitive values and create a redacted copy locally. | [Open tool](https://prabakaras.github.io/dataengineeringtools/pii.html) |
| JSON Schema Generator | Infer a draft 2020-12 JSON Schema from example JSON. | [Open tool](https://prabakaras.github.io/dataengineeringtools/schema.html) |
| Schema Diff | Compare JSON schemas and report contract changes by property path. | [Open tool](https://prabakaras.github.io/dataengineeringtools/schema-diff.html) |
| SQL Data Explorer | Import CSV, JSON, or Parquet and run local SQL queries using DuckDB-Wasm. | [Open tool](https://prabakaras.github.io/dataengineeringtools/sql-explorer.html) |
| Parquet Viewer | Inspect Parquet schema and preview rows locally in the browser. | [Open tool](https://prabakaras.github.io/dataengineeringtools/parquet.html) |
| Tool Usage Analytics | View, export, and clear local page usage metrics on this device. | [Open tool](https://prabakaras.github.io/dataengineeringtools/analytics.html) |

## Common Workflows

### Clean and inspect data

1. Use the **JSON Formatter** to validate payloads or API responses.
2. Use the **CSV / JSON Converter** when moving tabular data between tools.
3. Use the **CSV Data Profiler** to check row count, populated values, unique values, inferred types, and samples.
4. Use **Data Masking** before pasting an extract into tickets, documentation, or chat.

### Prepare queries and checks

1. Format a query with the **SQL Formatter** before review or handoff.
2. Generate a starter null, duplicate, range, or accepted-value check with **Data Quality Rules**.
3. Compare versions of a query or configuration file with **Text Diff**.
4. Use **Cron Helper** to explain a standard five-field schedule.

### Create safe test records

1. Open the **Synthetic Data Generator**.
2. Paste a common `CREATE TABLE` statement and select the number of rows, from 1 to 10,000.
3. Generate records and review the in-browser preview.
4. Export the generated data in CSV, Excel-compatible `.xls`, or SQL `INSERT` format.

The generator recognizes common type and column-name patterns for IDs, names, email addresses, city, status, phone numbers, UUIDs, dates, numbers, and booleans. It supports conventional comma-separated column definitions. Table-level constraints, advanced dialect syntax, computed columns, and nonstandard DDL should be reviewed or simplified before generation.

### Scan before sharing

1. Open the **PII Scanner**.
2. Paste a log, payload, extract, or document.
3. Review detected email addresses, phone numbers, IP addresses, UUIDs, card-like numbers, and token-like values.
4. Copy the redacted result after reviewing it manually.

The scanner uses browser-side pattern matching. It is a review aid, not a complete privacy or secrets-detection system.

### Explore local files with SQL

1. Open **SQL Data Explorer**.
2. Import a local CSV, JSON, or Parquet file.
3. Run SQL queries over the in-browser view.
4. Review result tables without uploading data.

DuckDB-Wasm is downloaded by the browser when the tool is used. Query execution remains local.

### Inspect Parquet files

1. Open **Parquet Viewer**.
2. Import a `.parquet` file.
3. Review inferred schema details and row previews.

Large files may use noticeable memory because all processing stays in the browser.

### Local usage analytics

The **Tool Usage Analytics** page shows local per-page view counts stored in `localStorage` on your device.

- Metrics are not uploaded by default.
- You can export usage JSON from the analytics page.
- You can clear local usage data at any time.

## Exports

The Synthetic Data Generator provides three local export options:

| Export | Use case |
| --- | --- |
| CSV | Load sample data into spreadsheets, BI tools, or data platforms. |
| Excel-compatible `.xls` | Open the generated table directly in Microsoft Excel. |
| SQL `INSERT` script | Load fictional records into a SQL Server-style test table. |

Generated values are fictional. Review output before running it in a database or sharing it outside your team.

## Privacy

All processing happens locally in the browser. Pasted content, imported files, generated records, and exported files are not uploaded to a server.

This is a client-side convenience tool, not a replacement for approved data-protection controls. Do not paste production secrets, access tokens, customer data, or regulated data unless your organization permits local browser processing.

## Browser Support

Use a current version of Chrome, Edge, Firefox, or Safari. File download and clipboard behavior can vary based on browser and local security settings.

## Run Locally

Clone the repository and open `index.html` directly in a browser. No build process, package installation, or server is required.

```powershell
git clone https://github.com/prabakaras/dataengineeringtools.git
Set-Location dataengineeringtools
Start-Process index.html
```

The shared behavior lives in `app.js`, and site-wide styling lives in `styles.css`. Each utility is a standalone HTML page, which keeps the site compatible with GitHub Pages.

## Contributing

Contributions should preserve the core design constraints:

- Keep processing local to the browser; do not add telemetry, credentials, or a backend for routine tools.
- Use accessible labels, keyboard-friendly native controls, and clear validation feedback.
- Keep new tools dependency-free when practical and add them to the landing page and this README.
- Validate JavaScript with `node --check app.js` before submitting a change.
- Do not include real customer, production, or secret data in examples or commits.

## Publish Updates

GitHub Pages deploys the contents of the `main` branch from the repository root. Push changes to `main` to publish an update. The live URL is `https://prabakaras.github.io/dataengineeringtools/`.

## Discovery

The landing page includes search and social-sharing metadata. `robots.txt` and `sitemap.xml` allow search engines to discover the landing page and each tool route. Submit `https://prabakaras.github.io/dataengineeringtools/sitemap.xml` to Google Search Console and Bing Webmaster Tools after verifying ownership of the GitHub Pages property.