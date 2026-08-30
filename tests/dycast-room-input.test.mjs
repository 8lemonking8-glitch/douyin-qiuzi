import assert from 'node:assert/strict';
import { parseDycastRoomInput } from '../web/src/adapters/dycast-room-input.js';

assert.equal(parseDycastRoomInput('587076826065'), '587076826065');
assert.equal(parseDycastRoomInput('https://live.douyin.com/587076826065'), '587076826065');
assert.throws(() => parseDycastRoomInput('https://v.douyin.com/yOSsmwA-NO4/'), /短链/);
assert.throws(() => parseDycastRoomInput('7649725129967285311'), /内部 room_id/);
console.log('PASS: Dycast room input parser');
