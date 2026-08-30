// MIT-licensed Dycast Desktop core is vendored as a Git submodule.
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

  async start(roomNumber) {
    const room = parseDycastRoomInput(roomNumber);
    this.stop();
    this.onStatus({ connected: 0, error: null, connecting: true, roomNumber: room, detail: `正在连接房间 ${room}，请稍候…` });

    const cast = new DyCast(room, { maxReconnectCount: 5 });
    let timeout;
    let settled = false;
    const completed = new Promise((resolve, reject) => {
      const finish = (type, value) => {
        if (settled) return;
        settled = true;
        clearTimeout(timeout);
        this.pendingConnection = null;
        type === 'resolve' ? resolve(value) : reject(value);
      };

      timeout = setTimeout(() => {
        const error = new Error('连接等待超过 20 秒。请确认直播已公开、正在开播，并输入电脑浏览器地址栏中的 live.douyin.com 房间号。');
        this.onStatus({ connected: 0, error: error.message, connecting: false, roomNumber: room, detail: error.message });
        cast.close(1000, '连接超时');
        finish('reject', error);
      }, CONNECT_TIMEOUT_MS);

      this.pendingConnection = {
        cast,
        cancel: () => finish('reject', new Error('已取消连接'))
      };

      cast.on('open', (_event, info) => {
        this.onStatus({ connected: 1, error: null, connecting: false, roomNumber: room, roomInfo: info, detail: `已连接房间 ${room}，正在接收弹幕。` });
        finish('resolve');
      });
      cast.on('message', messages => messages.forEach(message => this.onComment(message)));
      cast.on('reconnecting', count => this.onStatus({ connected: 0, error: null, connecting: true, roomNumber: room, detail: `连接中断，正在重连（第 ${count} 次）…` }));
      cast.on('error', error => {
        const detail = error?.message || String(error || '连接失败，未收到错误详情');
        this.onStatus({ connected: 0, error: detail, connecting: false, roomNumber: room, detail });
        finish('reject', new Error(detail));
      });
      cast.on('close', (_code, reason) => {
        const detail = reason || '直播间连接已关闭';
        if (!settled) {
          this.onStatus({ connected: 0, error: detail, connecting: false, roomNumber: room, detail });
          finish('reject', new Error(detail));
        } else {
          this.onStatus({ connected: 0, error: null, connecting: false, roomNumber: room, detail });
        }
      });
    });

    this.cast = cast;
    void cast.connect();
    return completed;
  }

  stop() {
    if (this.pendingConnection) this.pendingConnection.cancel();
    if (this.cast) this.cast.close(1000, '主播主动断开');
    this.cast = null;
    this.onStatus({ connected: 0, error: null, connecting: false, roomNumber: null, detail: '已断开直播间连接' });
  }
}
