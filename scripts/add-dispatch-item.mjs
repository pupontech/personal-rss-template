import fs from "node:fs";

const eventPath = process.argv[2];

if (!eventPath) {
  throw new Error("Missing GitHub event path.");
}

const event = JSON.parse(fs.readFileSync(eventPath, "utf8"));
const inputs = event.inputs || {};
const url = (inputs.url || "").trim();
const title = (inputs.title || "").trim() || url;
const notes = (inputs.notes || "").trim();

if (!url || !/^https?:\/\//i.test(url)) {
  throw new Error(`Invalid or missing URL: ${url}`);
}

const itemsPath = "items.json";
const items = fs.existsSync(itemsPath)
  ? JSON.parse(fs.readFileSync(itemsPath, "utf8"))
  : [];

const id = `workflow-dispatch-${process.env.GITHUB_RUN_ID || Date.now()}`;
const alreadyExists = items.some((item) => item.url === url);

if (!alreadyExists) {
  items.unshift({
    id,
    title,
    url,
    notes,
    date: new Date().toISOString(),
    sourceIssue: ""
  });
}

items.sort((a, b) => new Date(b.date) - new Date(a.date));
fs.writeFileSync(itemsPath, JSON.stringify(items, null, 2) + "\n");
