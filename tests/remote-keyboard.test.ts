import test from "node:test";
import assert from "node:assert/strict";
import { remoteKeysyms } from "../src/remote-keyboard.ts";

test("remote keyboard forwards typing, Return, paste, umlauts and Unicode", () => {
  assert.deepEqual(remoteKeysyms("\u200b", "\u200bHiä🙂\n"), [72, 105, 228, 0x0101f642, 0xff0d]);
  assert.deepEqual(remoteKeysyms("\u200babc", "\u200babc"), []);
  assert.deepEqual(remoteKeysyms("\u200b", "\u200b\t"), [0xff09]);
});

test("remote keyboard handles Backspace on an empty field and whole-character corrections", () => {
  assert.deepEqual(remoteKeysyms("\u200b", ""), [0xff08]);
  assert.deepEqual(remoteKeysyms("\u200bä🙂", "\u200bä"), [0xff08]);
  assert.deepEqual(remoteKeysyms("\u200bteh", "\u200bthe"), [0xff08, 0xff08, 104, 101]);
});
