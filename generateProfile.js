// Updates the "recent projects" list inside README.md.
// Needs Node 18 or newer (built-in fetch). Run: node update-readme.js

const fs = require("fs");
const path = require("path");

const USERNAME = "NurTheDev";
const README = path.join(__dirname, "README.md");
const START = "<!-- RECENT_PROJECTS:START -->";
const END = "<!-- RECENT_PROJECTS:END -->";

async function fetchRepos() {
  const headers = {
    "User-Agent": "readme-updater",
    Accept: "application/vnd.github+json",
  };
  // In GitHub Actions, pass secrets.GITHUB_TOKEN as GITHUB_TOKEN for a higher rate limit.
  if (process.env.GITHUB_TOKEN)
    headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;

  const url = `https://api.github.com/users/${USERNAME}/repos?type=owner&sort=pushed&per_page=100`;
  const res = await fetch(url, { headers });
  if (!res.ok) throw new Error(`GitHub API returned ${res.status}`);
  return res.json();
}

// Keep only real projects: no forks, no archived repos, not the profile repo,
// and only repos that have a description.
function pickProjects(repos, count = 3) {
  return repos
    .filter(
      (r) => !r.fork && !r.archived && r.name !== USERNAME && r.description,
    )
    .sort((a, b) => new Date(b.pushed_at) - new Date(a.pushed_at))
    .slice(0, count);
}

function toMarkdown(repos) {
  return repos
    .map((r) => {
      const description = r.description.replace(/\s+/g, " ").trim();
      const language = r.language || "n/a";
      const date = r.pushed_at.slice(0, 10); // same format on every machine
      return `- [${r.name}](${r.html_url}): ${description} <sub>(${language}, updated ${date})</sub>`;
    })
    .join("\n");
}

// Plain string slicing instead of a regex: no special characters to worry about.
function replaceBetweenMarkers(text, replacement) {
  const start = text.indexOf(START);
  const end = text.indexOf(END);
  if (start === -1 || end === -1 || end < start) {
    throw new Error(`Could not find ${START} and ${END} in README.md`);
  }
  return (
    text.slice(0, start + START.length) +
    "\n" +
    replacement +
    "\n" +
    text.slice(end)
  );
}

async function main() {
  const readme = fs.readFileSync(README, "utf-8");
  const projects = pickProjects(await fetchRepos());
  if (projects.length === 0) throw new Error("No repos matched the filter");

  const updated = replaceBetweenMarkers(readme, toMarkdown(projects));
  if (updated === readme) {
    console.log("No changes.");
    return;
  }
  fs.writeFileSync(README, updated, "utf-8");
  console.log("README.md updated.");
}

// If anything fails, stop and leave README.md exactly as it was.
main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
