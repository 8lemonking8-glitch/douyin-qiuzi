export class MockCommentProvider {
  constructor(onComment) { this.onComment = onComment; }
  start() {} stop() {}
  send(nickname, content) { this.onComment({ eventId: `mock-${Date.now()}-${crypto.randomUUID()}`, userId: `mock-${nickname}`, nickname, avatar: '', content }); }
}
