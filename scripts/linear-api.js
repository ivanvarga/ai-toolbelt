#!/usr/bin/env node
const https = require('https');
const { getCredential } = require('./resolve-credential');

const ENDPOINT = 'https://api.linear.app/graphql';
const IDENTIFIER_RE = /\b([A-Z][A-Z0-9]+-\d+)\b/;

function getToken() {
  const token = getCredential('tb.linear-token');
  if (!token) {
    process.stderr.write('Linear API key not found. Run: node skills/task-linear/setup-token.js\n');
    process.exit(1);
  }
  return token;
}

function extractIdentifier(input) {
  if (!input) return null;
  const match = input.match(IDENTIFIER_RE);
  return match ? match[1] : null;
}

function graphql(token, query, variables) {
  const body = JSON.stringify({ query, variables });
  return new Promise((resolve, reject) => {
    const req = https.request(ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': token,
        'Content-Length': Buffer.byteLength(body)
      }
    }, (res) => {
      let chunks = '';
      res.setEncoding('utf8');
      res.on('data', (c) => { chunks += c; });
      res.on('end', () => {
        if (res.statusCode < 200 || res.statusCode >= 300) {
          return reject(new Error(`Linear API ${res.statusCode}: ${chunks.slice(0, 500)}`));
        }
        try {
          const parsed = JSON.parse(chunks);
          if (parsed.errors) {
            return reject(new Error(`Linear GraphQL: ${parsed.errors.map(e => e.message).join('; ')}`));
          }
          resolve(parsed.data);
        } catch (e) {
          reject(new Error(`Failed to parse Linear response: ${e.message}`));
        }
      });
    });
    req.on('error', reject);
    req.setTimeout(15000, () => {
      req.destroy(new Error('Linear API request timed out after 15s'));
    });
    req.write(body);
    req.end();
  });
}

const ISSUE_QUERY = `
  query Issue($id: String!) {
    issue(id: $id) {
      id
      identifier
      url
      title
      description
      priority
      priorityLabel
      estimate
      branchName
      createdAt
      updatedAt
      state { name type }
      assignee { displayName email }
      creator { displayName email }
      project { name url }
      team { key name }
      labels(first: 50) { nodes { name color } }
      parent { identifier title url }
      children(first: 50) {
        nodes { identifier title url state { name } }
      }
      comments(first: 100) {
        nodes {
          id
          body
          createdAt
          user { displayName email }
        }
      }
      attachments(first: 50) {
        nodes { id title subtitle url sourceType }
      }
    }
  }
`;

async function fetchIssue(identifier) {
  const token = getToken();
  const data = await graphql(token, ISSUE_QUERY, { id: identifier });
  if (!data.issue) {
    throw new Error(`Issue ${identifier} not found (or token lacks access).`);
  }
  return data.issue;
}

function extractImageUrls(issue) {
  const seen = new Set();
  const urls = [];
  const imgExt = /\.(png|jpe?g|gif|webp|svg)(\?|$)/i;
  const mdImg = /!\[[^\]]*\]\(([^)\s]+)/g;
  const uploadsHost = /^https:\/\/uploads\.linear\.app\//;

  const consume = (text) => {
    if (!text) return;
    let m;
    while ((m = mdImg.exec(text)) !== null) {
      const url = m[1];
      if (seen.has(url)) continue;
      if (uploadsHost.test(url) || imgExt.test(url)) {
        seen.add(url);
        urls.push(url);
      }
    }
  };

  consume(issue.description);
  for (const c of (issue.comments?.nodes || [])) consume(c.body);
  return urls;
}

async function actionIssue(input) {
  const identifier = extractIdentifier(input);
  if (!identifier) {
    process.stderr.write(`Could not extract a Linear issue identifier from: ${input}\n`);
    process.exit(2);
  }
  const issue = await fetchIssue(identifier);
  const enriched = {
    ...issue,
    imageUrls: extractImageUrls(issue)
  };
  process.stdout.write(JSON.stringify(enriched, null, 2));
}

async function actionVerify() {
  const token = getToken();
  const data = await graphql(token, 'query { viewer { id email displayName } }', {});
  if (!data?.viewer?.id) {
    process.stderr.write('Linear viewer query returned no data — token may be invalid.\n');
    process.exit(1);
  }
  process.stdout.write(JSON.stringify(data.viewer, null, 2));
}

async function main() {
  const [,, action, ...args] = process.argv;
  if (!action) {
    process.stderr.write('Usage: linear-api.js <issue|verify> [identifier-or-url]\n');
    process.exit(1);
  }
  try {
    switch (action) {
      case 'issue':
        await actionIssue(args[0]);
        break;
      case 'verify':
        await actionVerify();
        break;
      default:
        process.stderr.write(`Unknown action: ${action}\n`);
        process.exit(1);
    }
  } catch (err) {
    process.stderr.write(`${err.message}\n`);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { fetchIssue, extractIdentifier, extractImageUrls };
