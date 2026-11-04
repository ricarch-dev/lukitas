import test from 'node:test';
import assert from 'node:assert/strict';
import { appendSearchPage } from '../src/modules/movements/presentation/search-page.ts';

test('late pagination from an older search cannot restore its results', () => {
  const current = { items: [{ id: 'new' }], hasMore: false };
  const late = { items: [{ id: 'old' }], hasMore: false };
  assert.equal(appendSearchPage(current, late, 1, 2), current);
  assert.equal(appendSearchPage(null, late, 1, 1), null);
  assert.deepEqual(appendSearchPage(current, late, 2, 2), {
    items: [{ id: 'new' }, { id: 'old' }],
    hasMore: false,
  });
});
