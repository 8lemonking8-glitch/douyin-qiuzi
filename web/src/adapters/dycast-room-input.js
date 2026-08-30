const WEB_ROOM_ID = /^\d{5,15}$/;

export function parseDycastRoomInput(value) {
  const input = String(value || '').trim();
  if (!input) throw new Error('请输入网页直播间地址或网页房间号。');
  if (/https?:\/\/v\.douyin\.com\//i.test(input) || /webcast\.amemv\.com\/douyin\/webcast\/reflow\//i.test(input)) {
    throw new Error('手机“复制链接”的短链不能直接使用。请打开公开直播间网页，复制 https://live.douyin.com/数字。');
  }
  const liveUrl = input.match(/https?:\/\/live\.douyin\.com\/(\d{5,15})(?:[/?#\s]|$)/i);
  if (liveUrl) return liveUrl[1];
  if (WEB_ROOM_ID.test(input)) return input;
  if (/^\d{16,20}$/.test(input)) throw new Error('这是内部 room_id，不是网页房间号。请复制 live.douyin.com/数字。');
  throw new Error('格式不正确。请输入 https://live.douyin.com/数字，或其中的 5–15 位网页房间号。');
}
