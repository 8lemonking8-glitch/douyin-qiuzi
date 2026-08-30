import assert from 'node:assert/strict';
import { parseDycastRoomInput } from '../web/src/adapters/dycast-room-input.js';

assert.equal(parseDycastRoomInput('123456789'), '123456789');
assert.equal(parseDycastRoomInput('https://live.douyin.com/123456789'), '123456789');
assert.equal(parseDycastRoomInput('直播地址 https://live.douyin.com/123456789?foo=bar'), '123456789');
assert.throws(
  () => parseDycastRoomInput('https://v.douyin.com/yOSsmwA-NO4/'),
  /手机“复制链接”/
);
assert.throws(() => parseDycastRoomInput('7679782914560723758'), /内部 room_id/);

console.log('PASS: Dycast web_rid parsing and mobile short-link rejection');
