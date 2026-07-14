# This is vibe coded if that bothers you dont use it.
# Think Pocket or Instapaper but as RSS as the endpoint.

## Personal RSS Feed Template

Create your own public RSS feed for articles and links using only GitHub Issues, Actions, and Pages. No server or paid service is required.

## Set up your feed

1. Click **Use this template** → **Create a new repository**.
2. Make the new repository **Public**.
3. Open **Settings → Actions → General**. Under **Workflow permissions**, select **Read and write permissions**, then save.
4. Open **Settings → Pages**. Under **Build and deployment**, choose **Deploy from a branch**, then select `main`, `/docs`, and save.
5. Open **Actions → Build personal RSS feed → Run workflow**. Leave all fields blank and run it once.
6. Wait for the workflow and Pages deployment to finish.
7. Subscribe to:

   ```text
   https://USERNAME.github.io/REPOSITORY/feed.xml
   ```

8. Install the browser bookmarklet from:

   ```text
   https://USERNAME.github.io/REPOSITORY/bookmarklet.html
   ```

Replace `USERNAME` and `REPOSITORY` with your GitHub username and new repository name. For a repository named `USERNAME.github.io`, omit the repository portion from the Pages URL.

## Add articles

### Bookmarklet

Open your bookmarklet installation page, drag **Send to RSS** to the bookmarks bar, then click it while viewing an article. It opens a prefilled GitHub issue. Submit the issue and the workflow updates your feed.

### GitHub issue form

Open **Issues → New issue → Add article to RSS feed**, provide the URL, and submit it. For safety, the workflow only processes issues opened by the repository owner.

### Manual Actions run

Open **Actions → Build personal RSS feed → Run workflow**, enter a URL and optional title/notes, and run it.

## Customize

Optional repository variables under **Settings → Secrets and variables → Actions → Variables**:

- `FEED_TITLE`
- `FEED_DESCRIPTION`
- `FEED_LANGUAGE`
- `FEED_SITE_URL` — useful for a custom domain

Run the workflow again after changing variables.

## Important notes

- The repository, article list, and RSS feed are public. Do not add sensitive links or notes.
- GitHub Pages may cache a deployment for about 10 minutes.
- RSS readers often poll every 15–60 minutes. A manual refresh may be needed.
- GitHub template copies do not inherit Pages or Actions-permission settings, so steps 3–5 are required for every new feed.

## Local verification

```text
python tests/verify-template.py
```

## License

MIT
