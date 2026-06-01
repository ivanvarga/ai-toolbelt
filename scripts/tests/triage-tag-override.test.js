const { test } = require('node:test');
const assert = require('node:assert/strict');
const { extractTriageTag } = require('../tb-triage/relay-filters');

test('triage-tag-override', async (t) => {
  await t.test('github-style label objects — triage:oneshot', () => {
    assert.equal(extractTriageTag([{ name: 'triage:oneshot' }]), 'oneshot');
  });

  await t.test('mixed labels returns first triage match (triage:skip)', () => {
    assert.equal(extractTriageTag([{ name: 'bug' }, { name: 'triage:skip' }]), 'skip');
  });

  await t.test('jira-style string labels — triage:oneshot', () => {
    assert.equal(extractTriageTag(['triage:oneshot']), 'oneshot');
  });

  await t.test('no triage label returns null', () => {
    assert.equal(extractTriageTag([{ name: 'not-a-tag' }]), null);
  });

  await t.test('skip trumps oneshot regardless of array order', () => {
    assert.equal(extractTriageTag([{ name: 'triage:oneshot' }, { name: 'triage:skip' }]), 'skip');
    assert.equal(extractTriageTag([{ name: 'triage:skip' }, { name: 'triage:oneshot' }]), 'skip');
  });
});
