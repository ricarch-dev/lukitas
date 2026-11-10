import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { stripTypeScriptTypes } from 'node:module';
import { test } from 'node:test';
import { setImmediate } from 'node:timers/promises';

for (const os of ['ios', 'android']) {
  test(`CSV export awaits SDK 58 file writes before sharing on ${os}`, async () => {
    const source = readFileSync(
      new URL('../src/modules/movements/actions/download-movements.ts', import.meta.url),
      'utf8',
    );
    const js = stripTypeScriptTypes(source)
      .replace(/^import .*;\r?$/gm, '')
      .replace('export async function', 'async function');
    const csv = 'date,amount\n2026-11-09,10\n';
    let content = '';
    let shared;
    let deleted = false;
    const pending = [];

    class File {
      uri = 'file:///cache/movements.csv';
      create() {
        content = '';
      }
      write(value) {
        const task = setImmediate().then(() => {
          content = value;
        });
        pending.push(task);
        return task;
      }
      delete() {
        deleted = true;
      }
    }

    const sharing = {
      isAvailableAsync: async () => true,
      shareAsync: async () => {
        shared = content;
      },
    };
    const save = new Function(
      'File',
      'Paths',
      'Sharing',
      'Platform',
      `${js}; return saveMovementsCsv;`,
    )(File, { cache: 'file:///cache' }, sharing, { OS: os });

    await save(csv, 'movements.csv');
    await Promise.all(pending);
    assert.equal(shared, csv);
    assert.equal(deleted, true);
  });
}
