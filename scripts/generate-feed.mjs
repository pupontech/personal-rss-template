import fs from "node:fs";
import path from "node:path";

const itemsPath = "items.json";
const docsDir = "docs";

const items = fs.existsSync(itemsPath)
  ? JSON.parse(fs.readFileSync(itemsPath, "utf8"))
  : [];

const repoFull = process.env.GITHUB_REPOSITORY || "USERNAME/REPO";
const [owner, repo] = repoFull.split("/");

if (!owner || !repo) {
  throw new Error(`Invalid GITHUB_REPOSITORY: ${repoFull}`);
}

const ownerLower = owner.toLowerCase();
const repoLower = repo.toLowerCase();
const defaultBaseUrl =
  repoLower === `${ownerLower}.github.io`
    ? `https://${owner}.github.io`
    : `https://${owner}.github.io/${repo}`;

const siteUrl = (process.env.FEED_SITE_URL || defaultBaseUrl).replace(/\/$/, "");
const feedUrl = `${siteUrl}/feed.xml`;
const issuesUrl = `https://github.com/${owner}/${repo}/issues/new`;

const feedTitle = process.env.FEED_TITLE || "My Personal Article Feed";
const feedDescription = process.env.FEED_DESCRIPTION || "Articles I send to myself";
const feedLanguage = process.env.FEED_LANGUAGE || "en";

function xmlEscape(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function rfc822(date) {
  return new Date(date).toUTCString();
}

const latestDate = items[0]?.date || "1970-01-01T00:00:00.000Z";
const rssItems = items
  .map((item) => {
    const description = item.notes || item.url;
    return `    <item>
      <title>${xmlEscape(item.title || item.url)}</title>
      <link>${xmlEscape(item.url)}</link>
      <guid isPermaLink="false">${xmlEscape(item.id || item.url)}</guid>
      <pubDate>${rfc822(item.date || latestDate)}</pubDate>
      <description>${xmlEscape(description)}</description>
    </item>`;
  })
  .join("\n");

const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${xmlEscape(feedTitle)}</title>
    <link>${xmlEscape(siteUrl)}</link>
    <atom:link href="${xmlEscape(feedUrl)}" rel="self" type="application/rss+xml" />
    <description>${xmlEscape(feedDescription)}</description>
    <language>${xmlEscape(feedLanguage)}</language>
    <lastBuildDate>${rfc822(latestDate)}</lastBuildDate>
${rssItems}
  </channel>
</rss>
`;

const index = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${xmlEscape(feedTitle)}</title>
    <link rel="alternate" type="application/rss+xml" title="${xmlEscape(feedTitle)}" href="feed.xml">
  </head>
  <body>
    <h1>${xmlEscape(feedTitle)}</h1>
    <p>${xmlEscape(feedDescription)}</p>
    <p><a href="feed.xml">RSS feed</a></p>
    <p><a href="bookmarklet.html">Install the Send to RSS bookmarklet</a></p>
    <h2>Ways to add articles</h2>
    <ol>
      <li><strong>Bookmarklet:</strong> install it once, then click it on any article page.</li>
      <li><strong>GitHub issue:</strong> open a new issue with the Add article form.</li>
      <li><strong>GitHub Actions:</strong> run the workflow manually with URL, title, and notes.</li>
    </ol>
    <h2>Current items</h2>
    <ul>
      ${items
        .map((item) => `<li><a href="${xmlEscape(item.url)}">${xmlEscape(item.title || item.url)}</a></li>`)
        .join("\n      ")}
    </ul>
  </body>
</html>
`;

const bookmarkletCode = `javascript:(()=>{const u=location.href,t=document.title||u,s=(getSelection&&getSelection().toString().trim())||'',b=['### Article URL','',u,'','### Title','',t,'','### Notes','',s].join('\\n');open('${issuesUrl}?title='+encodeURIComponent('Add article: '+t.slice(0,160))+'&body='+encodeURIComponent(b)+'&labels=rss-item','_blank','noopener');})();`;

const bookmarklet = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Install Send to RSS Bookmarklet</title>
    <style>
      body { color: #17202a; font-family: system-ui, sans-serif; line-height: 1.55; margin: 2rem auto; max-width: 760px; padding: 0 1rem; }
      .bookmarklet { background: #0969da; border-radius: 999px; color: white; display: inline-block; font-weight: 700; margin: 1rem 0; padding: .75rem 1rem; text-decoration: none; }
      code { background: #f6f8fa; border-radius: 6px; padding: .15rem .3rem; }
    </style>
  </head>
  <body>
    <h1>Install “Send to RSS”</h1>
    <p>Drag this button to your bookmarks bar:</p>
    <p><a class="bookmarklet" href="${xmlEscape(bookmarkletCode)}">Send to RSS</a></p>
    <h2>Use it</h2>
    <ol>
      <li>Open any article page.</li>
      <li>Optionally highlight text to use as notes.</li>
      <li>Click <strong>Send to RSS</strong>.</li>
      <li>Submit the prefilled GitHub issue.</li>
    </ol>
    <p>The workflow adds the article, rebuilds the feed, and closes the issue.</p>
    <p>Repository: <a href="https://github.com/${xmlEscape(owner)}/${xmlEscape(repo)}">${xmlEscape(repoFull)}</a></p>
    <p>Your feed: <a href="feed.xml">feed.xml</a></p>
    <p><a href="./">Back to feed home</a></p>
  </body>
</html>
`;

fs.mkdirSync(docsDir, { recursive: true });
fs.writeFileSync(path.join(docsDir, "feed.xml"), rss);
fs.writeFileSync(path.join(docsDir, "index.html"), index);
fs.writeFileSync(path.join(docsDir, "bookmarklet.html"), bookmarklet);
