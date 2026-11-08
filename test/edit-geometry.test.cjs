'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const layout = require('../core/layout.cjs');
const edit = require('../core/edit-geometry.cjs');

test('edit-geometry supports proportional resize, Shift free-resize, Alt edge-crop, and alignment snap', () => {
  const base = { id: 'comments', x: 100, y: 200, width: 400, height: 300, sourceWidth: 400, sourceHeight: 300, visible: true, locked: false, layer: 1 };
  const resized = edit.gesture(base, 'se', 80, 20, { shiftKey: false });
  assert.equal(resized.width, 480);
  assert.equal(resized.height, 360);

  const free = edit.gesture(base, 'se', 80, 20, { shiftKey: true });
  assert.equal(free.width, 480);
  assert.equal(free.height, 320);

  const cropped = edit.gesture(base, 'w', 50, 0, { altKey: true });
  assert.equal(cropped.crop.left, 50);
  assert.equal(cropped.x, 150);
  assert.equal(cropped.width, 350);

  const snapped = edit.snap({ ...base, x: 754, y: 386 }, [], { width: 1920, height: 1080 }, 1, { handle: 'move' });
  assert.equal(snapped.item.x + snapped.item.width * 0.5, 960);
  assert.ok(snapped.guides.some(g => g.axis === 'x' && g.position === 960));

  const bypassed = edit.snap({ ...base, x: 754, y: 386 }, [], { width: 1920, height: 1080 }, 1, { handle: 'move', ctrlKey: true });
  assert.equal(bypassed.item.x, 754);
  assert.equal(bypassed.guides.length, 0);
});

test('layout validate accepts optional sourceWidth, sourceHeight, and crop metadata', () => {
  const p = layout.preset('landscape');
  p.modules[0] = {
    ...p.modules[0],
    sourceWidth: 600,
    sourceHeight: 450,
    crop: { left: 20, top: 10, right: 30, bottom: 15 }
  };
  const validated = layout.validate(p, 'landscape');
  assert.deepEqual(validated.modules[0].crop, { left: 20, top: 10, right: 30, bottom: 15 });
  assert.equal(validated.modules[0].sourceWidth, 600);
});
