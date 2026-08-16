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