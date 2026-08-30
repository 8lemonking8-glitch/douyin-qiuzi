// This adapter reuses the official, MIT-licensed Dycast Desktop core unchanged.
// The quiz app only subscribes to its normalized chat events.
import '../../../vendor/dycast-desktop/public/mssdk.js';
import { DyCast } from '../../../vendor/dycast-desktop/src/core/dycast.ts';
import { parseDycastRoomInput } from './dycast-room-input.js';

const CONNECT_TIMEOUT_MS = 20_000;

export class DirectDycastProvider {
  constructor({ onComment, onStatus }) {
    this.onComment = onComment;
    this.onStatus = onStatus;
    this.cast = null;
    this.pendingConnection = null;
  }

  async start(roomInput) {
    const roomNumber = parseDycastRoomInput(roomInput);
    this.stop(false);
    this.onStatus({ connected: 0, connecting: true, roomNumber, error: null, detail: '正在连接房间 ' + roomNumber + '，请稍候…' });

    const cast = new DyCast(roomNumber, { maxReconnectCount: 5 });
    this.cast = cast;
    let timeout;
    let settled = false;

    const connected = new Promise((resolve, reject) => {
      const finish = (ok, value) => {
        if (settled) return;
        settled = true;
        clearTimeout(timeout);
        this.pendingConnection = null;
        if (ok) resolve(value); else reject(value);
      };

      timeout = setTimeout(() => {
        const error = new Error('连接等待超过 20 秒。请确认直播已公开、正在开播，并输入 live.douyin.com 的网页房间号。');
        this.onStatus({ connected: 0, connecting: false, roomNumber, error: error.message, detail: error.message });
        cast.close(1000, '连接超时');
        finish(false, error);
      }, CONNECT_TIMEOUT_MS);

      this.pendingConnection = { cast, cancel: () => finish(false, new Error('已取消连接')) };
      cast.on('open', (_event, info) => {
        this.onStatus({ connected: 1, connecting: false, roomNumber, error: null, roomInfo: info, detail: '已连接房间 ' + roomNumber + '，正在接收弹幕。' });
        finish(true);
      });
      cast.on('message', messages => {
        for (const message of messages || []) this.onComment(message);
      });
      cast.on('reconnecting', count => {
        this.onStatus({ connected: 0, connecting: true, roomNumber, error: null, detail: '连接中断，正在重连（第 ' + count + ' 次）…' });
      });
      cast.on('error', error => {
        const detail = error && error.message ? error.message : String(error || '连接失败，未收到错误详情');
        this.onStatus({ connected: 0, connecting: false, roomNumber, error: detail, detail });
        finish(false, new Error(detail));
      });
      cast.on('close', (_code, reason) => {
        const detail = reason || '直播间连接已关闭';
        if (!settled) {
          this.onStatus({ connected: 0, connecting: false, roomNumber, error: detail, detail });
          finish(false, new Error(detail));
        } else {
          this.onStatus({ connected: 0, connecting: false, roomNumber, error: null, detail });
        }
      });
    });

    void cast.connect();
    return connected;
  }

  stop(report = true) {
    if (this.pendingConnection) this.pendingConnection.cancel();
    if (this.cast) this.cast.close(1000, '主播主动断开');
    this.cast = null;
    if (report) this.onStatus({ connected: 0, connecting: false, roomNumber: null, error: null, detail: '已断开内置 Dycast 连接。' });
  }
}
