import assert from 'node:assert/strict';
import { test } from 'node:test';
import { appBasePath, createPageSearch, isAppEntry, readPage } from '../../src/router/page-location';
import { resolveGuestLocation } from '../../src/features/auth/demo-session';

test('guest and signed-in entry points keep the expected return target', () => {
  assert.deepEqual(resolveGuestLocation('', false), { search: '?page=landing' });
  assert.deepEqual(resolveGuestLocation('', true), { search: '?page=workspace' });
  const target = '?page=projects&kind=canvas&create=1';
  assert.deepEqual(resolveGuestLocation(target, false), {
    search: '?page=login',
    returnTo: target,
  });
  assert.deepEqual(resolveGuestLocation(target, true), { search: target });
  assert.equal(readPage(new URLSearchParams('page=unknown')), null);
});

test('task deep links survive billing and result round trips and clear outside that flow', () => {
  const source = '?page=team-tasks&task=TASK-1&dfrom=2026-11-05&view=tasks&pg=3';
  const result = createPageSearch(source, 'result', { from: 'team' });
  const billing = new URLSearchParams(createPageSearch(result, 'billing'));
  assert.equal(billing.get('task'), 'TASK-1');
  assert.equal(billing.get('dfrom'), '2026-11-05');
  assert.equal(billing.get('pg'), '3');
  assert.equal(billing.has('from'), false);
  assert.equal(createPageSearch(billing.toString(), 'workspace'), '?page=workspace');
});

test('canvas list and editor parameters are scoped to their destinations', () => {
  assert.equal(
    createPageSearch('?page=projects&kind=canvas&create=1', 'canvas', { canvas: 'cv2' }),
    '?page=canvas&canvas=cv2',
  );
  assert.equal(
    createPageSearch('?page=canvas&canvas=cv2', 'projects', { kind: 'canvas' }),
    '?page=projects&kind=canvas',
  );
});

test('the GitHub Pages entry matches the configured subpath without swallowing unknown paths', () => {
  const base = '/nova-tale-hub-web/';
  assert.equal(appBasePath('./'), '/');
  assert.equal(isAppEntry('/index.html', './'), true);
  assert.equal(isAppEntry('/nova-tale-hub-web/', base), true);
  assert.equal(isAppEntry('/nova-tale-hub-web/index.html', base), true);
  assert.equal(isAppEntry('/nova-tale-hub-web/missing', base), false);
  assert.deepEqual(resolveGuestLocation('?page=missing', false), { search: '?page=missing' });
});
