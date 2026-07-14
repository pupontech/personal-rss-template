import fs from "node:fs";

const eventPath = process.argv[2];

if (!eventPath) {
  throw new Error("Missing GitHub event path.");
}

const event = JSON.parse(fs.readFileSync(eventPath, "utf8"));
const issue = event.issue;

if (!issue) {
  throw new Error("No issue found in event payload.");
}

function getField(body, label) {
  const regex = new RegExp(
    `### ${label}\\s*\\n\\s*([\\s\\S]*?)(?=\\n### |$)`,
    "i"
  );

  const match = body.match(regex);
  if (!match) return "";

  const value = match[1]
    .replace(/<!--[\s\S]*?-->/g, "")
    .trim();

  return value === "_No response_" ? "" : value;
}

const body = issue.body || "";

const url = getField(body, "Article URL");
const title = getField(body, "Title") || issue.title.replace(/^Add article:\s*/i, "").trim() || url;
const notes = getField(body, "Notes");

if (!url || !/^https?:\/\//i.test(url)) {
  throw new Error(`Invalid or missing Article URL: ${url}`);
}

const itemsPath = "items.json";
const items = fs.existsSync(itemsPath)
  ? JSON.parse(fs.readFileSync(itemsPath, "utf8"))
  : [];

const id = `github-issue-${issue.number}`;
const alreadyExists = items.some((item) => item.id === id || item.url === url);

if (!alreadyExists) {
  items.unshift({
    id,
    title,
    url,
    notes,
    date: issue.created_at,
    sourceIssue: issue.html_url
  });
}

items.sort((a, b) => new Date(b.date) - new Date(a.date));
fs.writeFileSync(itemsPath, JSON.stringify(items, null, 2) + "\n");
