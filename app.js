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