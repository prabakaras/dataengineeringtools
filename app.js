const byId = (id) => document.getElementById(id);

function setStatus(element, message, isError = false) {
  element.textContent = message;
  element.classList.toggle("error", isError);
}

async function copyText(text, status, message = "Copied to clipboard.") {
  if (!text || text.includes("will appear here")) {
    setStatus(status, "Nothing to copy yet.", true);
    return;
  }
  try {
    await navigator.clipboard.writeText(text);
    setStatus(status, message);
  } catch {
    setStatus(status, "Clipboard access was unavailable. Select and copy the result.", true);
  }
}

function setupJsonTool() {
  const input = byId("json-input");
  if (!input) return;
  const output = byId("json-output");
  const status = byId("json-status");
  const format = () => {
    const value = input.value.trim();
    if (!value) {
      output.textContent = "Formatted JSON will appear here.";
      setStatus(status, "Waiting for JSON input.");
      return;
    }
    try {
      output.textContent = JSON.stringify(JSON.parse(value), null, 2);
      setStatus(status, "Valid JSON. Formatted with two-space indentation.");
    } catch (error) {
      output.textContent = "JSON could not be formatted.";
      setStatus(status, `Invalid JSON: ${error.message}`, true);
    }
  };
  input.addEventListener("input", format);
  byId("json-sample").addEventListener("click", () => {
    input.value = '{"workspace":"Workbench","tools":["JSON","CSV","SQL"],"private":true}';
    format();
  });
  byId("json-copy").addEventListener("click", () => copyText(output.textContent, status));
  byId("json-clear").addEventListener("click", () => {
    input.value = "";
    format();
    input.focus();
  });
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    if (character === '"') {
      if (quoted && text[index + 1] === '"') { field += '"'; index += 1; } else quoted = !quoted;
    } else if (character === "," && !quoted) { row.push(field); field = ""; }
    else if ((character === "\n" || character === "\r") && !quoted) {
      if (character === "\r" && text[index + 1] === "\n") index += 1;
      row.push(field); if (row.some((cell) => cell !== "")) rows.push(row); row = []; field = "";
    } else field += character;
  }
  row.push(field); if (row.some((cell) => cell !== "")) rows.push(row);
  if (quoted) throw new Error("An opening quote has no matching closing quote.");
  return rows;
}

function csvToJson(csv) {
  const rows = parseCsv(csv);
  if (rows.length < 2) throw new Error("Provide a header row and at least one data row.");
  const headers = rows[0].map((header, index) => header.trim() || `column_${index + 1}`);
  return rows.slice(1).map((row) => Object.fromEntries(headers.map((header, index) => [header, row[index] ?? ""])));
}

function escapeCsv(value) {
  const text = value === null || value === undefined ? "" : typeof value === "object" ? JSON.stringify(value) : String(value);
  return /[",\n\r]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function jsonToCsv(json) {
  const data = JSON.parse(json);
  if (!Array.isArray(data) || !data.length || !data.every((item) => item && typeof item === "object" && !Array.isArray(item))) {
    throw new Error("JSON must be a non-empty array of objects.");
  }
  const headers = [...new Set(data.flatMap((item) => Object.keys(item)))];
  return [headers.map(escapeCsv).join(","), ...data.map((item) => headers.map((header) => escapeCsv(item[header])).join(","))].join("\n");
}

function setupConverter() {
  const input = byId("convert-input");
  if (!input) return;
  const output = byId("convert-output");
  const status = byId("convert-status");
  const mode = byId("convert-mode");
  const inputLabel = byId("convert-input-label");
  const outputLabel = byId("convert-output-label");
  const updateLabels = () => {
    const csvToJsonMode = mode.value === "csv-to-json";
    inputLabel.textContent = csvToJsonMode ? "CSV INPUT" : "JSON INPUT";
    outputLabel.textContent = csvToJsonMode ? "JSON OUTPUT" : "CSV OUTPUT";
    output.textContent = "Converted data will appear here.";
    setStatus(status, "Choose a direction and paste your data.");
  };
  const convert = () => {
    try {
      if (!input.value.trim()) throw new Error("Add data to convert.");
      const result = mode.value === "csv-to-json" ? JSON.stringify(csvToJson(input.value), null, 2) : jsonToCsv(input.value);
      output.textContent = result;
      setStatus(status, "Conversion complete.");
    } catch (error) { setStatus(status, error.message, true); }
  };
  mode.addEventListener("change", updateLabels);
  byId("convert-run").addEventListener("click", convert);
  byId("convert-sample").addEventListener("click", () => {
    input.value = mode.value === "csv-to-json" ? "name,team,active\nAda,Analytics,true\nLin,Platform,false" : '[\n  {"name":"Ada","team":"Analytics","active":true},\n  {"name":"Lin","team":"Platform","active":false}\n]';
    convert();
  });
  byId("convert-file").addEventListener("change", (event) => {
    const [file] = event.target.files;
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => { input.value = reader.result; setStatus(status, `${file.name} loaded. Ready to convert.`); };
    reader.readAsText(file);
  });
  byId("convert-copy").addEventListener("click", () => copyText(output.textContent, status));
  byId("convert-download").addEventListener("click", () => {
    const text = output.textContent;
    if (!text || text.includes("will appear here")) { setStatus(status, "Convert data before downloading.", true); return; }
    const extension = mode.value === "csv-to-json" ? "json" : "csv";
    const blob = new Blob([text], { type: extension === "json" ? "application/json" : "text/csv" });
    const link = Object.assign(document.createElement("a"), { href: URL.createObjectURL(blob), download: `workbench-output.${extension}` });
    link.click(); URL.revokeObjectURL(link.href); setStatus(status, "Download started.");
  });
}

function setupSqlTool() {
  const input = byId("sql-input");
  if (!input) return;
  const output = byId("sql-output");
  const status = byId("sql-status");
  const keywordPattern = /\b(select|from|where|and|or|inner join|left join|right join|full join|join|on|group by|order by|having|limit|offset|union all|union|insert into|values|update|set|delete from|create table|alter table|drop table|as|case|when|then|else|end|distinct|with)\b/gi;
  const format = () => {
    if (!input.value.trim()) { setStatus(status, "Paste a query to begin.", true); return; }
    const casing = document.querySelector('input[name="sql-case"]:checked').value;
    let result = input.value.trim().replace(/\s+/g, " ").replace(keywordPattern, (word) => casing === "upper" ? word.toUpperCase() : word.toLowerCase());
    const keywords = casing === "upper" ? { select: "SELECT", from: "FROM", where: "WHERE", join: "JOIN", on: "ON", group: "GROUP BY", order: "ORDER BY", having: "HAVING", limit: "LIMIT", union: "UNION", insert: "INSERT INTO", values: "VALUES", update: "UPDATE", set: "SET", delete: "DELETE FROM" } : { select: "select", from: "from", where: "where", join: "join", on: "on", group: "group by", order: "order by", having: "having", limit: "limit", union: "union", insert: "insert into", values: "values", update: "update", set: "set", delete: "delete from" };
    Object.values(keywords).forEach((keyword) => { result = result.replace(new RegExp(`\\s+${keyword}\\s+`, "g"), `\n${keyword}\n  `); });
    result = result.replace(/,\s*/g, ",\n  ").replace(/\n\s*\n/g, "\n");
    output.textContent = result.trim(); setStatus(status, "Formatted for reading. Review before running it.");
  };
  byId("sql-format").addEventListener("click", format);
  byId("sql-sample").addEventListener("click", () => { input.value = "select customer_id, count(*) as order_count, sum(total) as revenue from orders where created_at >= '2026-01-01' and status = 'paid' group by customer_id order by revenue desc limit 20"; format(); });
  byId("sql-copy").addEventListener("click", () => copyText(output.textContent, status));
  byId("sql-clear").addEventListener("click", () => { input.value = ""; output.textContent = "Formatted SQL will appear here."; setStatus(status, "Paste a query to begin."); input.focus(); });
}

setupJsonTool();
setupConverter();
setupSqlTool();

function escapeHtml(value) {
  return String(value).replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[character]);
}

function setupProfiler() {
  const input = byId("profile-input");
  if (!input) return;
  const output = byId("profile-output");
  const status = byId("profile-status");
  const profile = () => {
    try {
      const rows = parseCsv(input.value);
      if (rows.length < 2) throw new Error("Provide a header row and at least one data row.");
      const headers = rows[0];
      const data = rows.slice(1);
      const summary = headers.map((header, index) => {
        const values = data.map((row) => row[index] ?? "");
        const populated = values.filter((value) => value.trim() !== "");
        const numeric = populated.length > 0 && populated.every((value) => !Number.isNaN(Number(value)) && value.trim() !== "");
        return `<tr><td>${escapeHtml(header || `column_${index + 1}`)}</td><td>${populated.length}/${data.length}</td><td>${new Set(populated).size}</td><td>${numeric ? "Number" : "Text"}</td><td>${escapeHtml(populated.slice(0, 2).join(", ") || "-")}</td></tr>`;
      }).join("");
      output.innerHTML = `<div class="metric-row"><strong>${data.length}</strong><span>data rows</span><strong>${headers.length}</strong><span>columns</span></div><table><thead><tr><th>Column</th><th>Filled</th><th>Unique</th><th>Inferred type</th><th>Sample</th></tr></thead><tbody>${summary}</tbody></table>`;
      setStatus(status, `Profile complete: ${data.length} rows and ${headers.length} columns.`);
    } catch (error) { output.textContent = "Profile results will appear here."; setStatus(status, error.message, true); }
  };
  byId("profile-run").addEventListener("click", profile);
  byId("profile-sample").addEventListener("click", () => { input.value = "customer_id,region,revenue,active\n101,North,250.00,true\n102,South,175.50,true\n103,North,,false\n104,West,310.00,true"; profile(); });
  byId("profile-file").addEventListener("change", (event) => { const [file] = event.target.files; if (!file) return; const reader = new FileReader(); reader.onload = () => { input.value = reader.result; profile(); }; reader.readAsText(file); });
}

function setupDiff() {
  const left = byId("diff-left");
  if (!left) return;
  const right = byId("diff-right");
  const output = byId("diff-output");
  const status = byId("diff-status");
  const compare = () => {
    const original = left.value.split("\n");
    const revised = right.value.split("\n");
    if (!left.value && !right.value) { setStatus(status, "Add text to compare.", true); return; }
    const length = Math.max(original.length, revised.length);
    let added = 0; let removed = 0; let changed = 0;
    const lines = Array.from({ length }, (_, index) => {
      const before = original[index]; const after = revised[index];
      if (before === after) return `<div class="diff-line"><span>${index + 1}</span><code>${escapeHtml(before ?? "")}</code></div>`;
      if (before === undefined) { added += 1; return `<div class="diff-line diff-add"><span>+</span><code>${escapeHtml(after)}</code></div>`; }
      if (after === undefined) { removed += 1; return `<div class="diff-line diff-remove"><span>-</span><code>${escapeHtml(before)}</code></div>`; }
      changed += 1; return `<div class="diff-line diff-remove"><span>-</span><code>${escapeHtml(before)}</code></div><div class="diff-line diff-add"><span>+</span><code>${escapeHtml(after)}</code></div>`;
    }).join("");
    output.innerHTML = lines || "No differences found.";
    setStatus(status, `${added} added, ${removed} removed, ${changed} changed line${added + removed + changed === 1 ? "" : "s"}.`);
  };
  byId("diff-run").addEventListener("click", compare);
  byId("diff-sample").addEventListener("click", () => { left.value = "SELECT customer_id\nFROM orders\nWHERE status = 'paid'"; right.value = "SELECT customer_id, total\nFROM orders\nWHERE status = 'completed'"; compare(); });
}

function setupTimestamp() {
  const input = byId("timestamp-input");
  if (!input) return;
  const output = byId("timestamp-output"); const status = byId("timestamp-status");
  const convert = () => {
    const value = input.value.trim();
    if (!value) { setStatus(status, "Enter a Unix timestamp or date value.", true); return; }
    const numeric = /^-?\d+(\.\d+)?$/.test(value);
    const date = numeric ? new Date(Number(value) * (value.length <= 10 ? 1000 : 1)) : new Date(value);
    if (Number.isNaN(date.getTime())) { setStatus(status, "That value is not a valid timestamp or date.", true); return; }
    output.innerHTML = `<dl class="key-values"><dt>ISO 8601</dt><dd>${date.toISOString()}</dd><dt>UTC</dt><dd>${date.toUTCString()}</dd><dt>Local</dt><dd>${date.toLocaleString()}</dd><dt>Unix seconds</dt><dd>${Math.floor(date.getTime() / 1000)}</dd><dt>Unix milliseconds</dt><dd>${date.getTime()}</dd></dl>`;
    setStatus(status, "Conversion complete.");
  };
  byId("timestamp-run").addEventListener("click", convert);
  byId("timestamp-now").addEventListener("click", () => { input.value = String(Date.now()); convert(); });
  byId("timestamp-copy").addEventListener("click", () => copyText(output.innerText, status));
}

function setupRegex() {
  const pattern = byId("regex-pattern");
  if (!pattern) return;
  const flags = byId("regex-flags"); const input = byId("regex-input"); const output = byId("regex-output"); const status = byId("regex-status");
  const test = () => {
    try {
      const regex = new RegExp(pattern.value, flags.value.includes("g") ? flags.value : `${flags.value}g`);
      const matches = [...input.value.matchAll(regex)];
      output.innerHTML = matches.length ? `<p class="result-summary">${matches.length} match${matches.length === 1 ? "" : "es"}</p>${matches.map((match, index) => `<div class="match-row"><span>${index + 1}</span><code>${escapeHtml(match[0])}</code><small>index ${match.index}</small></div>`).join("")}` : "No matches found.";
      setStatus(status, `${matches.length} match${matches.length === 1 ? "" : "es"} found.`);
    } catch (error) { output.textContent = "Match results will appear here."; setStatus(status, `Invalid regular expression: ${error.message}`, true); }
  };
  byId("regex-run").addEventListener("click", test);
  byId("regex-sample").addEventListener("click", () => { pattern.value = "\\b[A-Z]{2}-\\d{4}\\b"; flags.value = "g"; input.value = "Tickets DE-1024 and QA-8001 are ready. The code DEV-77 is not in scope."; test(); });
}

setupProfiler();
setupDiff();
setupTimestamp();
setupRegex();

function setupYaml() {
  const input = byId("yaml-input");
  if (!input) return;
  const output = byId("yaml-output"); const status = byId("yaml-status");
  const validate = () => {
    const lines = input.value.split("\n"); const errors = []; let previousIndent = 0;
    lines.forEach((line, index) => {
      if (!line.trim() || line.trim().startsWith("#")) return;
      const indent = line.match(/^ */)[0].length;
      if (indent % 2 !== 0) errors.push(`Line ${index + 1}: use an even number of spaces for indentation.`);
      if (indent > previousIndent + 2) errors.push(`Line ${index + 1}: indentation jumps more than one level.`);
      if (!/^\s*(-\s+.+|[^:#][^:]*:\s*.*)$/.test(line)) errors.push(`Line ${index + 1}: expected a key/value mapping or list item.`);
      previousIndent = indent;
    });
    if (!input.value.trim()) errors.push("Paste YAML to validate it.");
    output.innerHTML = errors.length ? `<ul class="validation-list">${errors.map((error) => `<li>${escapeHtml(error)}</li>`).join("")}</ul>` : "<p class=\"result-summary\">No common structural problems found.</p><p>Use a full YAML parser in your CI pipeline for schema-level validation.</p>";
    setStatus(status, errors.length ? `${errors.length} issue${errors.length === 1 ? "" : "s"} found.` : "Basic YAML validation passed.", Boolean(errors.length));
  };
  byId("yaml-run").addEventListener("click", validate);
  byId("yaml-sample").addEventListener("click", () => { input.value = "service:\n  name: analytics-api\n  replicas: 2\n  environment:\n    - production\n    - reporting"; validate(); });
}

function setupQualityRules() {
  const table = byId("quality-table");
  if (!table) return;
  const column = byId("quality-column"); const rule = byId("quality-rule"); const detail = byId("quality-detail"); const output = byId("quality-output"); const status = byId("quality-status");
  const generate = () => {
    const tableName = table.value.trim(); const columnName = column.value.trim(); const detailValue = detail.value.trim();
    if (!/^[A-Za-z_][A-Za-z0-9_.]*$/.test(tableName) || !/^[A-Za-z_][A-Za-z0-9_]*$/.test(columnName)) { setStatus(status, "Use simple table and column identifiers.", true); return; }
    let sql;
    if (rule.value === "not-null") sql = `SELECT COUNT(*) AS failing_rows\nFROM ${tableName}\nWHERE ${columnName} IS NULL;`;
    if (rule.value === "unique") sql = `SELECT ${columnName}, COUNT(*) AS duplicate_count\nFROM ${tableName}\nGROUP BY ${columnName}\nHAVING COUNT(*) > 1;`;
    if (rule.value === "range") { const [minimum, maximum] = detailValue.split(",").map((value) => value.trim()); if (!minimum || !maximum || Number.isNaN(Number(minimum)) || Number.isNaN(Number(maximum))) { setStatus(status, "For a range, provide min,max. For example: 0,100.", true); return; } sql = `SELECT COUNT(*) AS failing_rows\nFROM ${tableName}\nWHERE ${columnName} NOT BETWEEN ${minimum} AND ${maximum}\n   OR ${columnName} IS NULL;`; }
    if (rule.value === "accepted") { const values = detailValue.split(",").map((value) => value.trim()).filter(Boolean); if (!values.length) { setStatus(status, "Provide comma-separated accepted values.", true); return; } sql = `SELECT DISTINCT ${columnName}\nFROM ${tableName}\nWHERE ${columnName} NOT IN (${values.map((value) => `'${value.replaceAll("'", "''")}'`).join(", ")})\n   OR ${columnName} IS NULL;`; }
    output.textContent = sql; setStatus(status, "SQL check generated. Review it for your database dialect.");
  };
  byId("quality-run").addEventListener("click", generate);
  byId("quality-sample").addEventListener("click", () => { table.value = "orders"; column.value = "status"; rule.value = "accepted"; detail.value = "pending,paid,refunded"; generate(); });
  byId("quality-copy").addEventListener("click", () => copyText(output.textContent, status));
}

function setupMasking() {
  const input = byId("mask-input");
  if (!input) return;
  const output = byId("mask-output"); const status = byId("mask-status");
  const mask = () => {
    let text = input.value;
    if (byId("mask-email").checked) text = text.replace(/\b([A-Za-z0-9._%+-])[A-Za-z0-9._%+-]*(@[A-Za-z0-9.-]+\.[A-Za-z]{2,})\b/g, "$1***$2");
    if (byId("mask-phone").checked) text = text.replace(/\b(?:\+?\d[\d .()-]{7,}\d)\b/g, (value) => `${"*".repeat(Math.max(0, value.length - 4))}${value.slice(-4)}`);
    if (byId("mask-id").checked) text = text.replace(/\b\d{8,}\b/g, (value) => `${"*".repeat(value.length - 4)}${value.slice(-4)}`);
    output.textContent = text || "Masked text will appear here."; setStatus(status, text ? "Masking complete. Review the result before sharing." : "Add text to mask.", !text);
  };
  byId("mask-run").addEventListener("click", mask);
  byId("mask-sample").addEventListener("click", () => { input.value = "Customer: ava.chen@example.com\nPhone: +1 (555) 123-4567\nAccount ID: 8392017645"; mask(); });
  byId("mask-copy").addEventListener("click", () => copyText(output.textContent, status));
}

function setupCron() {
  const input = byId("cron-input");
  if (!input) return;
  const output = byId("cron-output"); const status = byId("cron-status");
  const names = { month: ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"], weekday: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"] };
  const label = (value, unit, values) => value === "*" ? `every ${unit}` : values && /^\d+$/.test(value) && values[Number(value)] ? values[Number(value)] : value.includes("/") ? `every ${value.split("/")[1]} ${unit}s` : value;
  const explain = () => {
    const fields = input.value.trim().split(/\s+/);
    if (fields.length !== 5 || !fields.every((field) => /^[\d*/,-]+$/.test(field))) { setStatus(status, "Use five fields containing numbers, *, /, commas, or ranges.", true); return; }
    const [minute, hour, day, month, weekday] = fields;
    output.innerHTML = `<dl class="key-values"><dt>Minute</dt><dd>${escapeHtml(label(minute, "minute"))}</dd><dt>Hour</dt><dd>${escapeHtml(label(hour, "hour"))}</dd><dt>Day of month</dt><dd>${escapeHtml(label(day, "day"))}</dd><dt>Month</dt><dd>${escapeHtml(label(month, "month", names.month))}</dd><dt>Day of week</dt><dd>${escapeHtml(label(weekday, "day", names.weekday))}</dd></dl><p class="result-summary">Expression: <code>${escapeHtml(input.value.trim())}</code></p>`;
    setStatus(status, "Schedule fields explained. Confirm timezone with the scheduler that runs it.");
  };
  byId("cron-run").addEventListener("click", explain);
  byId("cron-sample").addEventListener("click", () => { input.value = "*/15 8-18 * * 1-5"; explain(); });
}

setupYaml();
setupQualityRules();
setupMasking();
setupCron();

function setupSyntheticData() {
  const ddl = byId("synthetic-ddl");
  if (!ddl) return;
  const count = byId("synthetic-count"); const output = byId("synthetic-output"); const status = byId("synthetic-status"); const meta = byId("synthetic-meta");
  const exportButtons = [byId("synthetic-csv"), byId("synthetic-excel"), byId("synthetic-sql")];
  let generatedRows = []; let generatedColumns = []; let tableName = "synthetic_data";
  const firstNames = ["Ava", "Noah", "Mia", "Liam", "Priya", "Ethan", "Zara", "Arun", "Nora", "Mateo", "Ivy", "Leo"];
  const lastNames = ["Patel", "Chen", "Smith", "Garcia", "Kumar", "Brown", "Wilson", "Taylor", "Martin", "Davis"];
  const cities = ["Chennai", "Bengaluru", "London", "Singapore", "New York", "Toronto", "Sydney", "Berlin"];
  const pick = (items) => items[Math.floor(Math.random() * items.length)];
  const identifier = (value) => value.replace(/^[\[\`\"]|[\]\`\"]$/g, "").trim();
  const parseDdl = (text) => {
    const tableMatch = text.match(/CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?([\[\]`"\w.]+)/i);
    if (!tableMatch) throw new Error("Start with a CREATE TABLE statement.");
    const opening = text.indexOf("(", tableMatch.index); const closing = text.lastIndexOf(")");
    if (opening < 0 || closing <= opening) throw new Error("Could not find the column list in parentheses.");
    const definitions = text.slice(opening + 1, closing).split(/,(?![^()]*\))/);
    const columns = definitions.map((definition) => definition.trim()).filter((definition) => definition && !/^(PRIMARY|FOREIGN|UNIQUE|CONSTRAINT|CHECK|KEY|INDEX)\b/i.test(definition)).map((definition) => {
      const match = definition.match(/^([\[\]`"\w]+)\s+([\w]+(?:\s*\([^)]*\))?)/i);
      if (!match) return null;
      return { name: identifier(match[1]), type: match[2].toLowerCase(), nullable: !/\bNOT\s+NULL\b/i.test(definition) };
    }).filter(Boolean);
    if (!columns.length) throw new Error("No supported column definitions were found.");
    return { table: identifier(tableMatch[1].split(".").pop()), columns };
  };
  const randomValue = (column, rowIndex) => {
    const name = column.name.toLowerCase(); const type = column.type;
    if (/(^|_)(id|.*_id)$/.test(name)) return rowIndex + 1001;
    if (/bool|bit/.test(type)) return Math.random() > .35;
    if (/date|time/.test(type)) { const date = new Date(Date.now() - Math.floor(Math.random() * 365 * 86400000)); return /date$/.test(type) && !/time/.test(type) ? date.toISOString().slice(0, 10) : date.toISOString().slice(0, 19).replace("T", " "); }
    if (/int|decimal|numeric|float|double|real|money/.test(type)) return /price|amount|cost|revenue|total|balance/.test(name) ? (Math.random() * 5000 + 10).toFixed(2) : Math.floor(Math.random() * 9000) + 100;
    if (/email/.test(name)) { const first = pick(firstNames).toLowerCase(); return `${first}.${pick(lastNames).toLowerCase()}${rowIndex}@example.test`; }
    if (/first.?name|given.?name/.test(name)) return pick(firstNames);
    if (/last.?name|surname|family.?name/.test(name)) return pick(lastNames);
    if (/name/.test(name)) return `${pick(firstNames)} ${pick(lastNames)}`;
    if (/city/.test(name)) return pick(cities);
    if (/status/.test(name)) return pick(["active", "pending", "inactive"]);
    if (/phone|mobile/.test(name)) return `+1-555-${String(Math.floor(Math.random() * 10000)).padStart(4, "0")}`;
    if (/uuid|guid/.test(name)) return crypto.randomUUID ? crypto.randomUUID() : `${rowIndex}-0000-4000-8000-${String(Math.random()).slice(2, 14)}`;
    if (/code/.test(name)) return `${column.name.slice(0, 3).toUpperCase()}-${String(rowIndex + 1).padStart(5, "0")}`;
    return `${column.name}_${String(rowIndex + 1).padStart(4, "0")}`;
  };
  const renderPreview = () => {
    const preview = generatedRows.slice(0, 20);
    output.innerHTML = `<table><thead><tr>${generatedColumns.map((column) => `<th>${escapeHtml(column.name)}</th>`).join("")}</tr></thead><tbody>${preview.map((row) => `<tr>${generatedColumns.map((column) => `<td>${escapeHtml(row[column.name])}</td>`).join("")}</tr>`).join("")}</tbody></table>`;
  };
  const generate = () => {
    try {
      const parsed = parseDdl(ddl.value); const rowCount = Number(count.value);
      if (!Number.isInteger(rowCount) || rowCount < 1 || rowCount > 10000) throw new Error("Choose a whole row count between 1 and 10,000.");
      tableName = parsed.table; generatedColumns = parsed.columns; generatedRows = Array.from({ length: rowCount }, (_, rowIndex) => Object.fromEntries(parsed.columns.map((column) => [column.name, column.nullable && Math.random() < .04 ? null : randomValue(column, rowIndex)])));
      renderPreview(); meta.textContent = `${rowCount} rows / ${parsed.columns.length} columns`; exportButtons.forEach((button) => { button.disabled = false; });
      setStatus(status, `${rowCount} synthetic rows generated for ${tableName}. Values are fictional and generated locally.`);
    } catch (error) { generatedRows = []; generatedColumns = []; output.textContent = "Generate data to preview the first rows."; exportButtons.forEach((button) => { button.disabled = true; }); setStatus(status, error.message, true); }
  };
  const download = (text, filename, type) => { const blob = new Blob([text], { type }); const link = Object.assign(document.createElement("a"), { href: URL.createObjectURL(blob), download: filename }); link.click(); URL.revokeObjectURL(link.href); };
  const toCsv = () => [generatedColumns.map((column) => escapeCsv(column.name)).join(","), ...generatedRows.map((row) => generatedColumns.map((column) => escapeCsv(row[column.name])).join(","))].join("\r\n");
  byId("synthetic-generate").addEventListener("click", generate);
  byId("synthetic-sample").addEventListener("click", () => { ddl.value = "CREATE TABLE customers (\n  customer_id INT PRIMARY KEY,\n  first_name VARCHAR(80) NOT NULL,\n  last_name VARCHAR(80) NOT NULL,\n  email VARCHAR(120),\n  city VARCHAR(80),\n  account_balance DECIMAL(12,2),\n  active BIT,\n  created_at TIMESTAMP\n);"; generate(); });
  byId("synthetic-csv").addEventListener("click", () => download(`\ufeff${toCsv()}`, `${tableName}_synthetic.csv`, "text/csv;charset=utf-8"));
  byId("synthetic-excel").addEventListener("click", () => { const table = `<table><thead><tr>${generatedColumns.map((column) => `<th>${escapeHtml(column.name)}</th>`).join("")}</tr></thead><tbody>${generatedRows.map((row) => `<tr>${generatedColumns.map((column) => `<td>${escapeHtml(row[column.name] ?? "")}</td>`).join("")}</tr>`).join("")}</tbody></table>`; download(`\ufeff<html><head><meta charset="UTF-8"></head><body>${table}</body></html>`, `${tableName}_synthetic.xls`, "application/vnd.ms-excel;charset=utf-8"); });
  byId("synthetic-sql").addEventListener("click", () => { const columns = generatedColumns.map((column) => `[${column.name}]`).join(", "); const statements = generatedRows.map((row) => { const values = generatedColumns.map((column) => { const value = row[column.name]; if (value === null) return "NULL"; if (typeof value === "boolean") return value ? "1" : "0"; if (/int|decimal|numeric|float|double|real|money|bit/.test(column.type) && !Number.isNaN(Number(value))) return value; return `'${String(value).replaceAll("'", "''")}'`; }).join(", "); return `INSERT INTO [${tableName}] (${columns}) VALUES (${values});`; }).join("\n"); download(statements, `${tableName}_synthetic.sql`, "text/sql;charset=utf-8"); });
}

setupSyntheticData();

function setupJsonTable() {
  const input = byId("json-table-input");
  if (!input) return;
  const output = byId("json-table-output"); const status = byId("json-table-status"); const search = byId("json-table-search");
  const csvButton = byId("json-table-csv"); const excelButton = byId("json-table-excel");
  let columns = []; let rows = [];
  const flatten = (value, prefix = "") => {
    if (value === null || value === undefined) return { [prefix || "value"]: "" };
    if (Array.isArray(value)) return { [prefix || "value"]: JSON.stringify(value) };
    if (typeof value !== "object") return { [prefix || "value"]: value };
    return Object.entries(value).reduce((flat, [key, nested]) => Object.assign(flat, flatten(nested, prefix ? `${prefix}.${key}` : key)), {});
  };
  const render = () => {
    const term = search.value.trim().toLowerCase();
    const visibleRows = rows.filter((row) => !term || columns.some((column) => String(row[column] ?? "").toLowerCase().includes(term)));
    output.innerHTML = `<table><thead><tr>${columns.map((column) => `<th>${escapeHtml(column)}</th>`).join("")}</tr></thead><tbody>${visibleRows.map((row) => `<tr>${columns.map((column) => `<td>${escapeHtml(row[column] ?? "")}</td>`).join("")}</tr>`).join("")}</tbody></table>`;
    setStatus(status, `${visibleRows.length} of ${rows.length} row${rows.length === 1 ? "" : "s"} shown. ${columns.length} column${columns.length === 1 ? "" : "s"}.`);
  };
  const convert = () => {
    try {
      const value = input.value.trim();
      if (!value) { rows = []; columns = []; output.textContent = "Paste an object or an array of objects to create a table."; search.disabled = true; csvButton.disabled = true; excelButton.disabled = true; setStatus(status, "Paste JSON to create a table."); return; }
      const parsed = JSON.parse(value); const records = Array.isArray(parsed) ? parsed : [parsed];
      if (!records.length || !records.every((record) => record && typeof record === "object" && !Array.isArray(record))) throw new Error("Use a JSON object or an array of JSON objects.");
      rows = records.map((record) => flatten(record)); columns = [...new Set(rows.flatMap((row) => Object.keys(row)))];
      search.disabled = false; csvButton.disabled = false; excelButton.disabled = false; render();
    } catch (error) { rows = []; columns = []; output.textContent = "Table output will appear here."; search.disabled = true; csvButton.disabled = true; excelButton.disabled = true; setStatus(status, `Invalid JSON: ${error.message}`, true); }
  };
  const download = (text, filename, type) => { const blob = new Blob([text], { type }); const link = Object.assign(document.createElement("a"), { href: URL.createObjectURL(blob), download: filename }); link.click(); URL.revokeObjectURL(link.href); };
  input.addEventListener("input", convert); search.addEventListener("input", render);
  byId("json-table-sample").addEventListener("click", () => { input.value = '[\n  {"id": 101, "customer": {"name": "Ava Chen", "email": "ava@example.test"}, "status": "active", "tags": ["priority", "new"]},\n  {"id": 102, "customer": {"name": "Leo Martin", "email": "leo@example.test"}, "status": "pending", "tags": ["review"]}\n]'; convert(); });
  byId("json-table-file").addEventListener("change", (event) => { const [file] = event.target.files; if (!file) return; const reader = new FileReader(); reader.onload = () => { input.value = reader.result; convert(); }; reader.readAsText(file); });
  csvButton.addEventListener("click", () => download(`\ufeff${[columns.map(escapeCsv).join(","), ...rows.map((row) => columns.map((column) => escapeCsv(row[column])).join(","))].join("\r\n")}`, "json-table.csv", "text/csv;charset=utf-8"));
  excelButton.addEventListener("click", () => { const table = `<table><thead><tr>${columns.map((column) => `<th>${escapeHtml(column)}</th>`).join("")}</tr></thead><tbody>${rows.map((row) => `<tr>${columns.map((column) => `<td>${escapeHtml(row[column] ?? "")}</td>`).join("")}</tr>`).join("")}</tbody></table>`; download(`\ufeff<html><head><meta charset="UTF-8"></head><body>${table}</body></html>`, "json-table.xls", "application/vnd.ms-excel;charset=utf-8"); });
}

setupJsonTable();

function setupPiiScanner() {
  const input = byId("pii-input");
  if (!input) return;
  const output = byId("pii-output"); const redacted = byId("pii-redacted"); const status = byId("pii-status");
  const checks = [
    { key: "Email", pattern: /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi },
    { key: "Phone", pattern: /(?<!\w)(?:\+?\d[\d .()-]{7,}\d)(?!\w)/g },
    { key: "IPv4 address", pattern: /(?<![\w.])(?:\d{1,3}\.){3}\d{1,3}(?![\w.])/g },
    { key: "UUID", pattern: /\b[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\b/gi },
    { key: "Credit-card-like number", pattern: /(?<!\w)(?:\d[ -]?){13,19}(?!\w)/g },
    { key: "API key or token", pattern: /\b(?:sk|pk|api|token|secret)[_-]?[a-z0-9]{12,}\b/gi }
  ];
  const scan = () => {
    const text = input.value;
    const findings = [];
    let masked = text;
    checks.forEach(({ key, pattern }) => {
      const matches = [...text.matchAll(pattern)].filter((match) => key !== "IPv4 address" || match[0].split(".").every((part) => Number(part) <= 255));
      matches.forEach((match) => findings.push({ key, value: match[0], index: match.index ?? 0 }));
      masked = masked.replace(pattern, `[REDACTED ${key.toUpperCase()}]`);
    });
    findings.sort((left, right) => left.index - right.index);
    output.innerHTML = findings.length ? `<p class="result-summary">${findings.length} likely sensitive value${findings.length === 1 ? "" : "s"} found.</p>${findings.map((finding, index) => `<div class="match-row"><span>${index + 1}</span><code>${escapeHtml(finding.key)}</code><small>position ${finding.index} · ${escapeHtml(finding.value)}</small></div>`).join("")}` : "No common PII patterns found.";
    redacted.textContent = masked || "Redacted text will appear here.";
    setStatus(status, text ? `${findings.length} likely finding${findings.length === 1 ? "" : "s"} detected. Review results before sharing.` : "Paste text to scan.", Boolean(!text));
  };
  byId("pii-run").addEventListener("click", scan);
  byId("pii-sample").addEventListener("click", () => { input.value = "User: ava.chen@example.com\nPhone: +1 (555) 123-4567\nServer: 192.168.10.24\nToken: sk_live_1234567890abcdef"; scan(); });
  byId("pii-copy").addEventListener("click", () => copyText(redacted.textContent, status, "Redacted text copied."));
}

setupPiiScanner();

function setupSchemaGenerator() {
  const input = byId("schema-input");
  if (!input) return;
  const output = byId("schema-output"); const status = byId("schema-status");
  const schemaFor = (value, title) => {
    if (value === null) return { type: "null" };
    if (Array.isArray(value)) {
      const items = value.length ? value.map((item) => schemaFor(item)).reduce((schemas, schema) => schemas.some((candidate) => JSON.stringify(candidate) === JSON.stringify(schema)) ? schemas : [...schemas, schema], []) : [];
      return { type: "array", ...(items.length === 1 ? { items: items[0] } : items.length > 1 ? { items: { anyOf: items } } : {}) };
    }
    if (typeof value === "object") {
      const entries = Object.entries(value); const properties = Object.fromEntries(entries.map(([key, child]) => [key, schemaFor(child, key)]));
      return { ...(title ? { title } : {}), type: "object", properties, ...(entries.length ? { required: entries.map(([key]) => key) } : {}), additionalProperties: false };
    }
    if (typeof value === "number") return { type: Number.isInteger(value) ? "integer" : "number" };
    return { type: typeof value };
  };
  const generate = () => {
    try {
      if (!input.value.trim()) throw new Error("Paste a JSON object or array to generate a schema.");
      const parsed = JSON.parse(input.value); output.textContent = JSON.stringify({ "$schema": "https://json-schema.org/draft/2020-12/schema", ...schemaFor(parsed, "GeneratedData") }, null, 2); setStatus(status, "Schema generated locally. Review required fields against your real contract.");
    } catch (error) { output.textContent = "Generated schema will appear here."; setStatus(status, `Invalid JSON: ${error.message}`, true); }
  };
  byId("schema-run").addEventListener("click", generate);
  byId("schema-sample").addEventListener("click", () => { input.value = '[{"id":101,"name":"Ava","active":true},{"id":102,"name":"Leo","active":false}]'; generate(); });
  byId("schema-copy").addEventListener("click", () => copyText(output.textContent, status));
}

function setupSchemaDiff() {
  const left = byId("schema-left");
  if (!left) return;
  const right = byId("schema-right"); const output = byId("schema-diff-output"); const status = byId("schema-diff-status");
  const typeOf = (schema) => schema && schema.type ? Array.isArray(schema.type) ? schema.type.join(" | ") : schema.type : schema && schema.anyOf ? schema.anyOf.map(typeOf).join(" | ") : "unknown";
  const compare = () => {
    try {
      const before = JSON.parse(left.value); const after = JSON.parse(right.value); const changes = [];
      const walk = (oldSchema, newSchema, path) => {
        if (!oldSchema) { changes.push(["Added", path, typeOf(newSchema)]); return; }
        if (!newSchema) { changes.push(["Removed", path, typeOf(oldSchema)]); return; }
        if (typeOf(oldSchema) !== typeOf(newSchema)) changes.push(["Type changed", path, `${typeOf(oldSchema)} → ${typeOf(newSchema)}`]);
        const oldProperties = oldSchema.properties || {}; const newProperties = newSchema.properties || {};
        [...new Set([...Object.keys(oldProperties), ...Object.keys(newProperties)])].forEach((key) => walk(oldProperties[key], newProperties[key], `${path}.${key}`));
        const oldRequired = new Set(oldSchema.required || []); const newRequired = new Set(newSchema.required || []);
        [...newRequired].filter((key) => !oldRequired.has(key)).forEach((key) => changes.push(["Required", `${path}.${key}`, "now required"]));
        [...oldRequired].filter((key) => !newRequired.has(key) && newProperties[key]).forEach((key) => changes.push(["Optional", `${path}.${key}`, "no longer required"]));
      };
      walk(before, after, "$root"); output.innerHTML = changes.length ? `<p class="result-summary">${changes.length} schema change${changes.length === 1 ? "" : "s"} found.</p>${changes.map(([kind, path, detail]) => `<div class="match-row"><span>${escapeHtml(kind)}</span><code>${escapeHtml(path)}</code><small>${escapeHtml(detail)}</small></div>`).join("")}` : "No structural changes found."; setStatus(status, changes.length ? `${changes.length} change${changes.length === 1 ? "" : "s"} found.` : "Schemas are structurally equivalent.", false);
    } catch (error) { output.textContent = "Schema comparison will appear here."; setStatus(status, `Both inputs must be valid JSON schemas: ${error.message}`, true); }
  };
  byId("schema-diff-run").addEventListener("click", compare);
  byId("schema-diff-sample").addEventListener("click", () => { left.value = '{"type":"object","properties":{"id":{"type":"integer"},"name":{"type":"string"}},"required":["id"]}'; right.value = '{"type":"object","properties":{"id":{"type":"string"},"email":{"type":"string","format":"email"}},"required":["id","email"]}'; compare(); });
}

setupSchemaGenerator();
setupSchemaDiff();

function setupToolCatalog() {
  const grid = document.querySelector(".tool-grid");
  if (!grid) return;
  const search = byId("tool-search"); const group = byId("tool-group"); const favoritesOnly = byId("favorites-only"); const count = byId("catalog-count");
  const storageKey = "prabakar-tools-favorites";
  const favorites = new Set(JSON.parse(localStorage.getItem(storageKey) || "[]"));
  const cards = [...grid.querySelectorAll("a.tool-card")].map((link) => {
    const card = document.createElement("article");
    card.className = link.className;
    card.dataset.group = link.dataset.group;
    card.dataset.keywords = `${link.dataset.keywords} ${link.textContent}`.toLowerCase();
    link.className = "tool-card-link";
    const favorite = document.createElement("button");
    favorite.type = "button"; favorite.className = "favorite-button"; favorite.setAttribute("aria-label", `Add ${link.querySelector(".tool-name").textContent.replace(/\s+/g, " ").trim()} to favorites`);
    const toolId = link.getAttribute("href");
    const updateFavorite = () => { const selected = favorites.has(toolId); favorite.textContent = selected ? "★" : "☆"; favorite.setAttribute("aria-pressed", String(selected)); favorite.setAttribute("aria-label", `${selected ? "Remove" : "Add"} ${link.querySelector(".tool-name").textContent.replace(/\s+/g, " ").trim()} ${selected ? "from" : "to"} favorites`); };
    favorite.addEventListener("click", () => { if (favorites.has(toolId)) favorites.delete(toolId); else favorites.add(toolId); localStorage.setItem(storageKey, JSON.stringify([...favorites])); updateFavorite(); filter(); });
    link.replaceWith(card); card.append(link, favorite); updateFavorite(); return { card, toolId };
  });
  const filter = () => {
    const term = search.value.trim().toLowerCase(); const selectedGroup = group.value; const favoriteOnly = favoritesOnly.checked;
    let visible = 0;
    cards.forEach(({ card, toolId }) => {
      const matches = (!term || card.dataset.keywords.includes(term)) && (selectedGroup === "all" || card.dataset.group === selectedGroup) && (!favoriteOnly || favorites.has(toolId));
      card.classList.toggle("is-hidden", !matches); if (matches) visible += 1;
    });
    count.textContent = `${visible} tool${visible === 1 ? "" : "s"} shown`;
  };
  search.addEventListener("input", filter); group.addEventListener("change", filter); favoritesOnly.addEventListener("change", filter); filter();
}

setupToolCatalog();

function setupProfileFooter() {
  if (document.querySelector(".site-footer")) return;
  const footer = document.createElement("footer");
  footer.className = "site-footer";
  footer.innerHTML = '<span>WORKBENCH / CLIENT-SIDE / 2026</span><a href="https://www.linkedin.com/in/prabakarsamiyappan/" target="_blank" rel="noopener noreferrer">CONNECT ON LINKEDIN <span aria-hidden="true">↗</span></a>';
  document.body.append(footer);
}

setupProfileFooter();