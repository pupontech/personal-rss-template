import json
import os
from pathlib import Path
import shutil
import subprocess
import tempfile
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[1]
FAKE_REPOSITORY = "example-user/my-rss"
FAKE_SITE = "https://example-user.github.io/my-rss"
FORBIDDEN = (
    "pupontech/personal-rss",
    "stop-ruining-photos",
    "If There Is a Hired Photographer",
    "github-issue-1",
)


def run(*args, cwd, env=None):
    subprocess.run(args, cwd=cwd, env=env, check=True)


def main():
    items = json.loads((ROOT / "items.json").read_text(encoding="utf-8"))
    assert items == [], "Template must start with an empty items.json"

    workflow = (ROOT / ".github/workflows/rss.yml").read_text(encoding="utf-8")
    assert "github.actor == github.repository_owner" in workflow, "Issue intake is not owner-only"
    assert "docs/bookmarklet.html" in workflow, "Workflow does not commit generated bookmarklet"

    for script in (
        "scripts/generate-feed.mjs",
        "scripts/add-issue-item.mjs",
        "scripts/add-dispatch-item.mjs",
    ):
        run("node", "--check", str(ROOT / script), cwd=ROOT)

    sandbox = Path(tempfile.mkdtemp(prefix="personal-rss-template-test-"))
    try:
        shutil.copytree(ROOT / "scripts", sandbox / "scripts")
        shutil.copytree(ROOT / "docs", sandbox / "docs")
        (sandbox / "items.json").write_text("[]\n", encoding="utf-8")
        env = os.environ.copy()
        env.update({
            "GITHUB_REPOSITORY": FAKE_REPOSITORY,
            "FEED_TITLE": "Test Feed",
            "FEED_DESCRIPTION": "Test description",
            "FEED_LANGUAGE": "en",
        })

        run("node", "scripts/generate-feed.mjs", cwd=sandbox, env=env)
        first = {
            name: (sandbox / "docs" / name).read_text(encoding="utf-8")
            for name in ("feed.xml", "index.html", "bookmarklet.html")
        }
        run("node", "scripts/generate-feed.mjs", cwd=sandbox, env=env)
        second = {
            name: (sandbox / "docs" / name).read_text(encoding="utf-8")
            for name in ("feed.xml", "index.html", "bookmarklet.html")
        }
        assert first == second, "Empty-site generation must be deterministic"

        combined = "\n".join(first.values())
        assert FAKE_SITE in combined, "Generated output does not use fake Pages URL"
        assert f"https://github.com/{FAKE_REPOSITORY}/issues/new" in first["bookmarklet.html"], (
            "Bookmarklet does not target the copied repository"
        )
        for forbidden in FORBIDDEN:
            assert forbidden not in combined, f"Personal value leaked: {forbidden}"

        root = ET.fromstring(first["feed.xml"])
        channel = root.find("channel")
        assert channel is not None
        assert channel.findtext("link") == FAKE_SITE
        assert channel.findall("item") == []
        assert channel.find("{http://www.w3.org/2005/Atom}link").attrib["href"] == f"{FAKE_SITE}/feed.xml"

        dispatch = sandbox / "dispatch.json"
        dispatch.write_text(json.dumps({"inputs": {
            "url": "https://example.com/a?x=1&y=2",
            "title": "A <Title>",
            "notes": "Notes & details",
        }}), encoding="utf-8")
        dispatch_env = env | {"GITHUB_RUN_ID": "42"}
        run("node", "scripts/add-dispatch-item.mjs", str(dispatch), cwd=sandbox, env=dispatch_env)
        run("node", "scripts/add-dispatch-item.mjs", str(dispatch), cwd=sandbox, env=dispatch_env)

        issue = sandbox / "issue.json"
        issue.write_text(json.dumps({"issue": {
            "number": 7,
            "title": "Add article: Issue article",
            "body": "### Article URL\n\nhttps://example.com/b\n\n### Title\n\nIssue article\n\n### Notes\n\nUseful",
            "created_at": "2026-01-02T03:04:05Z",
            "html_url": "https://github.com/example-user/my-rss/issues/7",
        }}), encoding="utf-8")
        run("node", "scripts/add-issue-item.mjs", str(issue), cwd=sandbox, env=env)
        run("node", "scripts/add-issue-item.mjs", str(issue), cwd=sandbox, env=env)

        generated_items = json.loads((sandbox / "items.json").read_text(encoding="utf-8"))
        assert len(generated_items) == 2, "Importers are not idempotent"
        run("node", "scripts/generate-feed.mjs", cwd=sandbox, env=env)
        feed = (sandbox / "docs/feed.xml").read_text(encoding="utf-8")
        ET.fromstring(feed)
        assert "A &lt;Title&gt;" in feed and "Notes &amp; details" in feed
    finally:
        shutil.rmtree(sandbox, ignore_errors=True)

    print("template verification passed")


if __name__ == "__main__":
    main()
