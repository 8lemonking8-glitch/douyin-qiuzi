// MIT-licensed Dycast Desktop core is vendored as a Git submodule.
import '../../../vendor/dycast-desktop/public/mssdk.js';
import { DyCast } from '../../../vendor/dycast-desktop/src/core/dycast.ts';
import { parseDycastRoomInput } from './dycast-room-input.js';

export class DirectDycastProvider {
  constructor({ onComment, onStatus }) {
    this.onComment = onComment;
    this.onStatus = onStatus;
    this.cast = null;
  }

  async start(roomNumber) {
    const room = parseDycastRoomInput(roomNumber);
    this.stop();
    this.onStatus({ connected: 0, error: null, connecting: true, roomNumber: room });
    const cast = new DyCast(room, { maxReconnectCount: 5 });
    cast.on('open', (_event, info) => this.onStatus({ connected: 1, error: null, connecting: false, roomNumber: room, roomInfo: info }));
    cast.on('message', messages => messages.forEach(message => this.onComment(message)));
    cast.on('reconnecting', count => this.onStatus({ connected: 0, error: `正在重连（第 ${count} 次）`, connecting: true, roomNumber: room }));
    cast.on('error', error => this.onStatus({ connected: 0, error: error?.message || String(error), connecting: false, roomNumber: room }));
    cast.on('close', (_code, reason) => this.onStatus({ connected: 0, error: reason || null, connecting: false, roomNumber: room }));
    this.cast = cast;
    void cast.connect();
  }

  stop() {
    if (this.cast) this.cast.close(1000, '主播主动断开');
    this.cast = null;
  }
}
