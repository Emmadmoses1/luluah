import test from "node:test";
import assert from "node:assert/strict";
import { clampScale, clampPan, frameFromDrag } from "../src/lib/zoom.ts";

test("scale is clamped", () => {
  assert.equal(clampScale(0.2), 1);
  assert.equal(clampScale(9), 5);
  assert.equal(clampScale(2.5), 2.5);
});
test("pan cannot leave the image", () => {
  assert.deepEqual(clampPan(1, 50, 50, 400, 600), { x: 0, y: 0 });
  assert.deepEqual(clampPan(2, 999, -999, 400, 600), { x: 200, y: -300 });
  assert.deepEqual(clampPan(3, 10, 20, 400, 600), { x: 10, y: 20 });
});
test("360 drag wraps in both directions", () => {
  assert.equal(frameFromDrag(0, 0, 300, 24), 0);
  assert.equal(frameFromDrag(0, 300, 300, 24), 0);
  assert.equal(frameFromDrag(0, 25, 300, 24), 22);
  assert.equal(frameFromDrag(0, -25, 300, 24), 2);
  assert.equal(frameFromDrag(5, -300 * 3, 300, 24), 5);
  assert.equal(frameFromDrag(0, 10, 0, 24), 0);
});
