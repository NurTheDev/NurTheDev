const fs = require('fs');
const path = require('path');
const https = require('https');

// Load profile data
const profilePath = path.join(__dirname, 'profile.json');
const profile = JSON.parse(fs.readFileSync(profilePath, 'utf-8'));

// Helper to format array fields
const formatArray = arr => arr && arr.length ? arr.join(', ') : '';

// Helper to calculate age from birthdate
function calculateAge(birthdate) {
  const birth = new Date(birthdate);
  const today = new Date('2025-07-17'); // Use current date
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return age;
}

// Fetch recent GitHub repos
function fetchRecentRepos(username, count = 3) {
  return new Promise((resolve, reject) => {
    https.get(`https://api.github.com/users/${username}/repos?sort=updated&per_page=${count}`,
      {
        headers: {
          'User-Agent': 'node.js',
          'Accept': 'application/vnd.github.v3+json'
        }
      },
      (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            const repos = JSON.parse(data);
            resolve(repos);
          } catch (e) {
            reject(e);
          }
        });
      }
    ).on('error', reject);
  });
}

async function main() {
  const age = profile.birthdate ? calculateAge(profile.birthdate) : 'N/A';

  // Fetch recent projects from GitHub
  let recentProjectsMd = '';
  try {
    const repos = await fetchRecentRepos('NurTheDev', 3);
    recentProjectsMd = '## 🎯 Recent Projects\n';
    repos.forEach(repo => {
      recentProjectsMd += `\n### [${repo.name}](${repo.html_url})\n- **Description**: ${repo.description || 'No description'}\n- **Language**: ${repo.language || 'N/A'}\n- **Updated**: ${new Date(repo.updated_at).toLocaleDateString()}\n`;
    });
  } catch (e) {
    recentProjectsMd = '## 🎯 Recent Projects\n\n_Failed to fetch projects from GitHub._';
  }

  // Generate Markdown block
  const markdown = `NurTheDev@github\n-------------------------\nName: ${profile.name}\nPronouns: ${profile.pronouns}\nLocation: ${profile.location}\nUptime : ${age} Years\nOS: ${profile.os}\nShell: ${profile.shell}\nKernel : ${profile.kernel}\nIDE : ${profile.ide}\nExpertise: JavaScript, Node.js, Express, React, MongoDB\nHobbies: ${formatArray(profile.hobbies)}\nFavourite Timepass: ${profile.favouriteTimepass}\nEmail: ${profile.email}\nLinkdin: ${profile.linkedin}\n`;

  // Option 1: Print to console
  console.log('\n--- Generated Profile Section ---\n');
  console.log(markdown);
  console.log(recentProjectsMd);

  // Option 2: Replace section in README.md
  const readmePath = path.join(__dirname, 'README.md');
  let readme = fs.readFileSync(readmePath, 'utf-8');

  // Replace profile block
  const profileBlockRegex = /```csharp\nNurTheDev@github[\s\S]*?Linkdin:.*?\n```/;
  const newBlock = '```csharp\n' + markdown + '```';
  if (profileBlockRegex.test(readme)) {
    readme = readme.replace(profileBlockRegex, newBlock);
  }

  // Replace Recent Projects section
  const recentProjectsRegex = /## 🎯 Recent Projects[\s\S]*?(?=## |$)/;
  if (recentProjectsRegex.test(readme)) {
    readme = readme.replace(recentProjectsRegex, recentProjectsMd + '\n');
  } else {
    // If not found, append after profile block
    readme = readme.replace(newBlock, newBlock + '\n\n' + recentProjectsMd + '\n');
  }

  fs.writeFileSync(readmePath, readme, 'utf-8');
  console.log('\nREADME.md updated with dynamic profile and recent projects!');
}

main();
