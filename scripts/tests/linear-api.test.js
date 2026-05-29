const { test } = require('node:test');
const assert = require('node:assert/strict');
const { extractIdentifier, extractImageUrls } = require('../linear-api');

test('extractIdentifier — bare identifier', () => {
  assert.equal(extractIdentifier('ABC-123'), 'ABC-123');
});

test('extractIdentifier — full Linear URL with slug', () => {
  assert.equal(
    extractIdentifier('https://linear.app/acme/issue/ENG-4567/some-slug-here'),
    'ENG-4567'
  );
});

test('extractIdentifier — URL without trailing slug', () => {
  assert.equal(
    extractIdentifier('https://linear.app/acme/issue/PROD-9'),
    'PROD-9'
  );
});

test('extractIdentifier — multi-character team key', () => {
  assert.equal(extractIdentifier('ENG2-42'), 'ENG2-42');
});

test('extractIdentifier — no match returns null', () => {
  assert.equal(extractIdentifier('lowercase-123'), null);
  assert.equal(extractIdentifier(''), null);
  assert.equal(extractIdentifier(null), null);
});

test('extractImageUrls — inline uploads.linear.app images', () => {
  const issue = {
    description: 'See ![screenshot](https://uploads.linear.app/abc/foo.png) please.',
    comments: { nodes: [] }
  };
  assert.deepEqual(extractImageUrls(issue), ['https://uploads.linear.app/abc/foo.png']);
});

test('extractImageUrls — pulls from comments too, dedupes', () => {
  const url = 'https://uploads.linear.app/x/y.png';
  const issue = {
    description: `intro ![a](${url})`,
    comments: { nodes: [
      { body: `repeat ![b](${url})` },
      { body: 'another ![c](https://example.com/pic.jpg)' }
    ] }
  };
  assert.deepEqual(extractImageUrls(issue), [
    url,
    'https://example.com/pic.jpg'
  ]);
});

test('extractImageUrls — ignores non-image links', () => {
  const issue = {
    description: '![doc](https://example.com/file.pdf) and [text](https://example.com/page)',
    comments: { nodes: [] }
  };
  assert.deepEqual(extractImageUrls(issue), []);
});

test('extractImageUrls — handles missing description and comments', () => {
  assert.deepEqual(extractImageUrls({}), []);
  assert.deepEqual(extractImageUrls({ description: null, comments: null }), []);
});
