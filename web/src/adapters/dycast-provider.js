export class DycastCommentProvider {
  constructor(onPayload) { this.onPayload = onPayload; }
  start() {} stop() {}
  receive(payload) { return this.onPayload(payload); }
}
