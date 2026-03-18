#!/usr/bin/env node
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const { getCredential } = require('./resolve-credential');

function getSession() {
  const session = getCredential('tb.github-session');
  if (!session) {
    process.stderr.write('GitHub session not found. Run setup for pr-upload skill.\n');
    process.exit(1);
  }
  return session;
}

function cookieHeader(session) {
  return `user_session=${session}; __Host-user_session_same_site=${session}`;
}

const [,, action, ...args] = process.argv;

if (!action) {
  process.stderr.write('Usage: github-api.js upload <file_path> [owner/repo]\n');
  process.exit(1);
}

function upload(filePath, repo) {
  if (!filePath) {
    process.stderr.write('Usage: github-api.js upload <file_path> [owner/repo]\n');
    process.exit(1);
  }

  if (!fs.existsSync(filePath)) {
    process.stderr.write(`File not found: ${filePath}\n`);
    process.exit(1);
  }

  const session = getSession();
  const cookie = cookieHeader(session);
  const fileName = path.basename(filePath);
  const fileSize = fs.statSync(filePath).size;
  const contentType = execSync(`file --mime-type -b "${filePath}"`, { encoding: 'utf8' }).trim();

  if (!repo) {
    try {
      repo = execSync('gh repo view --json nameWithOwner -q .nameWithOwner', { encoding: 'utf8' }).trim();
    } catch {
      process.stderr.write('Could not detect repository. Provide owner/repo as second argument.\n');
      process.exit(1);
    }
  }

  let repoId;
  try {
    repoId = execSync(`gh api /repos/${repo} --jq .id`, { encoding: 'utf8' }).trim();
  } catch {
    process.stderr.write(`Could not get repository ID for ${repo}\n`);
    process.exit(1);
  }

  let policyResponse;
  try {
    const policyJson = execSync(
      `curl -sS -X POST "https://github.com/upload/policies/assets" ` +
      `-H "Cookie: ${cookie}" ` +
      `-H "GitHub-Verified-Fetch: true" ` +
      `-H "X-Requested-With: XMLHttpRequest" ` +
      `-H "Origin: https://github.com" ` +
      `-H "Accept: application/json" ` +
      `-F "repository_id=${repoId}" ` +
      `-F "name=${fileName}" ` +
      `-F "size=${fileSize}" ` +
      `-F "content_type=${contentType}"`,
      { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }
    );
    policyResponse = JSON.parse(policyJson);
  } catch (err) {
    process.stderr.write(`Failed to get upload policy: ${err.message}\n`);
    process.exit(1);
  }

  const uploadUrl = policyResponse.upload_url;
  const assetUploadUrl = policyResponse.asset_upload_url;
  const assetUploadToken = policyResponse.asset_upload_authenticity_token;
  const href = policyResponse.asset.href;

  if (!uploadUrl || !assetUploadUrl || !href) {
    process.stderr.write('Invalid policy response from GitHub\n');
    process.exit(1);
  }

  let formFields = '';
  for (const [key, value] of Object.entries(policyResponse.form || {})) {
    formFields += ` -F "${key}=${value}"`;
  }

  try {
    execSync(
      `curl -sS -X POST "${uploadUrl}"${formFields} -F "file=@${filePath}"`,
      { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }
    );
  } catch (err) {
    process.stderr.write(`Failed to upload file: ${err.message}\n`);
    process.exit(1);
  }

  try {
    execSync(
      `curl -sS -X PUT "${assetUploadUrl}" ` +
      `-H "Cookie: ${cookie}" ` +
      `-H "GitHub-Verified-Fetch: true" ` +
      `-H "X-Requested-With: XMLHttpRequest" ` +
      `-H "Origin: https://github.com" ` +
      `-H "Accept: application/json" ` +
      `-F "authenticity_token=${assetUploadToken}"`,
      { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }
    );
  } catch (err) {
    process.stderr.write(`Failed to finalize upload: ${err.message}\n`);
    process.exit(1);
  }

  process.stdout.write(href);
}

switch (action) {
  case 'upload':
    upload(args[0], args[1]);
    break;
  default:
    process.stderr.write(`Unknown action: ${action}\n`);
    process.exit(1);
}
