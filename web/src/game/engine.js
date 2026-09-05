import { normalizeQuestions } from './questions.js';
import { createPlayer, rankedPlayers } from './scoring.js';

const VALID_MODES = new Set(['first_correct', 'timer', 'manual']);
const VALID_ANSWERS = new Set(['A', 'B', 'C', 'D']);

export const LEVEL_LABELS = {
  all: '全部题库', highschool: '高中基础', cet4: '四级', cet6: '六级',
  ielts: '雅思', kaoyan: '考研', toefl: '托福', gre: 'GRE'
};

export class QuizEngine {
  constructor(questions, options = {}) {
    this.allQuestions = normalizeQuestions(questions);
    if (!this.allQuestions.length) throw new Error('题库为空或格式无效。');
    this.questions = this.allQuestions;
    this.activeLevel = 'all';
    this.scorePerCorrect = options.scorePerCorrect ?? 10;
    this.roundSeconds = options.roundSeconds ?? 15;
    this.autoDelayMs = options.autoDelayMs ?? 3000;
    this.mode = options.mode ?? 'first_correct';
    this.leaderboardScrollSpeed = options.leaderboardScrollSpeed ?? 30;
    this.leaderboardLimit = options.leaderboardLimit ?? 50;
    this.onChange = options.onChange ?? (() => {});
    this.onAutoNext = options.onAutoNext ?? (() => {});
    this.timer = null;
    this.autoNextTimer = null;
    this.seenEventIds = new Set();
    this.state = this.initialState();
  }

  initialState() {
    return {
      idx: 0, phase: 'idle', remaining: this.roundSeconds,
      stats: { A: 0, B: 0, C: 0, D: 0 }, answers: {}, players: {}, recent: [], comments: [], winner: null,
      dycastConnected: 0, directDycastConnected: 0,
      directDycastConnecting: false, directDycastRoom: null, directDycastDetail: null,
      dycastLastMessageAt: null, dycastError: null
    };
  }
  get question() { return this.questions[this.state.idx]; }
  notify() { this.onChange(this.snapshot()); }
  snapshot() {
    const q = this.question;
    return {
      idx: this.state.idx, total: this.questions.length, totalAll: this.allQuestions.length, phase: this.state.phase,
      activeLevel: this.activeLevel, activeLevelLabel: LEVEL_LABELS[this.activeLevel] || this.activeLevel,
      remaining: this.state.remaining, mode: this.mode, roundSeconds: this.roundSeconds,
      autoDelayMs: this.autoDelayMs, scorePerCorrect: this.scorePerCorrect,
      leaderboardScrollSpeed: this.leaderboardScrollSpeed, leaderboardLimit: this.leaderboardLimit,
      question: { ...q, answer: this.state.phase === 'revealed' ? q.answer : null },
      stats: { ...this.state.stats }, participantCount: Object.keys(this.state.answers).length,
      playerCount: Object.keys(this.state.players).length, leaderboard: rankedPlayers(this.state.players, this.leaderboardLimit),
      recent: [...this.state.recent].slice(-8).reverse(),
      comments: [...this.state.comments].slice(-30).reverse(), winner: this.state.winner,
      dycastConnected: this.state.dycastConnected,
      directDycastConnected: this.state.directDycastConnected,
      directDycastConnecting: this.state.directDycastConnecting,
      directDycastRoom: this.state.directDycastRoom,
      directDycastDetail: this.state.directDycastDetail,
      dycastLastMessageAt: this.state.dycastLastMessageAt, dycastError: this.state.dycastError
    };
  }
  clearTimers() { if (this.timer) clearInterval(this.timer); if (this.autoNextTimer) clearTimeout(this.autoNextTimer); this.timer = null; this.autoNextTimer = null; }
  clearRound() { this.state.answers = {}; this.state.stats = { A: 0, B: 0, C: 0, D: 0 }; this.state.recent = []; this.state.winner = null; }
  setMode(mode) { if (!VALID_MODES.has(mode) || mode === this.mode) return; this.mode = mode; if (this.state.phase !== 'idle') { this.clearTimers(); this.clearRound(); this.state.phase = 'idle'; this.state.remaining = this.roundSeconds; } this.notify(); }
  setRoundSeconds(seconds) { const n = Number(seconds); if (Number.isFinite(n) && n >= 5 && n <= 120) { this.roundSeconds = Math.round(n); if (this.state.phase !== 'answering') this.state.remaining = this.roundSeconds; this.notify(); } }
  setAutoDelay(seconds) { const n = Number(seconds); if (Number.isFinite(n) && n >= 1 && n <= 30) { this.autoDelayMs = Math.round(n * 1000); this.notify(); } }
  setScorePerCorrect(score) { const n = Number(score); if (Number.isFinite(n) && n >= 1 && n <= 9999) { this.scorePerCorrect = Math.round(n); this.notify(); } }
  setLeaderboardScrollSpeed(speed) { const n = Number(speed); if (Number.isFinite(n) && n >= 0 && n <= 200) { this.leaderboardScrollSpeed = Math.round(n); this.notify(); } }
  setLeaderboardLimit(limit) { const n = Number(limit); if (Number.isFinite(n) && n >= 3 && n <= 500) { this.leaderboardLimit = Math.round(n); this.notify(); } }
  setDirectDycastStatus({ connected = 0, connecting = false, roomNumber = null, error = null, detail = null } = {}) {
    this.state.directDycastConnected = Number(connected) || 0;
    this.state.directDycastConnecting = Boolean(connecting);
    this.state.directDycastRoom = roomNumber;
    this.state.directDycastDetail = detail;
    this.state.dycastConnected = this.state.directDycastConnected;
    this.state.dycastError = error;
    this.notify();
  }
  filterByLevel(level) { const target = LEVEL_LABELS[level] ? level : 'all'; this.activeLevel = target; this.questions = target === 'all' ? this.allQuestions : this.allQuestions.filter(question => question.level === target); if (!this.questions.length) { this.questions = this.allQuestions; this.activeLevel = 'all'; } this.clearTimers(); this.clearRound(); this.state.idx = 0; this.state.phase = 'idle'; this.state.remaining = this.roundSeconds; this.notify(); }
  shuffleQuestions() { for (let i = this.allQuestions.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [this.allQuestions[i], this.allQuestions[j]] = [this.allQuestions[j], this.allQuestions[i]]; } this.filterByLevel(this.activeLevel); }
  startRound() {
    if (this.state.phase !== 'idle' && this.state.phase !== 'revealed') return;
    this.clearTimers(); this.clearRound(); this.state.phase = 'answering'; this.state.remaining = this.roundSeconds; this.notify();
    if (this.mode !== 'manual') this.timer = setInterval(() => { this.state.remaining -= 1; this.state.remaining <= 0 ? this.revealAnswer(true) : this.notify(); }, 1000);
  }
  pause() { if (this.state.phase !== 'answering') return; this.clearTimers(); this.state.phase = 'paused'; this.notify(); }
  resume() { if (this.state.phase !== 'paused') return; this.state.phase = 'answering'; this.notify(); if (this.mode !== 'manual') this.timer = setInterval(() => { this.state.remaining -= 1; this.state.remaining <= 0 ? this.revealAnswer(true) : this.notify(); }, 1000); }
  revealAnswer(scheduleNext = false) { if (this.state.phase !== 'answering' && this.state.phase !== 'paused') return; this.clearTimers(); this.state.phase = 'revealed'; if (this.mode !== 'manual') this.state.remaining = 0; this.notify(); if (scheduleNext && this.mode !== 'manual') this.scheduleNext(); }
  scheduleNext() { this.autoNextTimer = setTimeout(() => { this.nextQuestion(true); this.onAutoNext(); }, this.autoDelayMs); }
  nextQuestion(autoStart = true) { this.clearTimers(); this.state.idx = (this.state.idx + 1) % this.questions.length; this.clearRound(); this.state.phase = 'idle'; this.state.remaining = this.roundSeconds; this.notify(); if (autoStart) this.startRound(); }
  previousQuestion() { this.clearTimers(); this.state.idx = (this.state.idx - 1 + this.questions.length) % this.questions.length; this.clearRound(); this.state.phase = 'idle'; this.state.remaining = this.roundSeconds; this.notify(); }
  resetGame() { this.clearTimers(); this.seenEventIds.clear(); this.state = this.initialState(); this.notify(); }
  clearLeaderboard() { this.state.players = {}; this.notify(); }
  normalizeAnswer(content) { if (typeof content !== 'string') return null; const value = content.trim().toUpperCase().replace(/[ＡＢＣＤ]/g, char => ({ Ａ: 'A', Ｂ: 'B', Ｃ: 'C', Ｄ: 'D' })[char]).replace(/[\s，。！？,.!?:：；;]/g, ''); return VALID_ANSWERS.has(value) ? value : null; }
  normalizeComment(raw) {
    if (!raw || raw.method !== 'WebcastChatMessage') return null;
    const user = raw.user || {};
    const userId = String(user.id || user.sec_openid || user.openId || user.unique_id || '');
    if (!userId) return null;
    return { eventId: raw.id == null ? null : String(raw.id), userId, nickname: String(user.name || user.nickname || '匿名观众').slice(0, 24), avatar: String(user.avatar || user.avatar_url || ''), content: String(raw.content || '') };
  }
  handleDycastPayload(payload) { let data = payload; if (typeof payload === 'string') { try { data = JSON.parse(payload); } catch { return 0; } } return (Array.isArray(data) ? data : [data]).reduce((count, raw) => count + Number(this.handleComment(raw)), 0); }
  handleComment(raw) {
    const comment = raw?.userId ? raw : this.normalizeComment(raw);
    if (!comment) return false;
    if (comment.eventId && this.seenEventIds.has(comment.eventId)) return false;
    if (comment.eventId) { this.seenEventIds.add(comment.eventId); if (this.seenEventIds.size > 10000) this.seenEventIds.delete(this.seenEventIds.values().next().value); }
    this.state.dycastLastMessageAt = Date.now();
    this.state.comments.push({ userId: comment.userId, nickname: comment.nickname, content: comment.content, ts: this.state.dycastLastMessageAt });
    if (this.state.comments.length > 80) this.state.comments.shift();
    if (this.state.phase !== 'answering') { this.notify(); return false; }
    const answer = this.normalizeAnswer(comment.content);
    if (!answer || this.state.answers[comment.userId]) { this.notify(); return false; }
    const correct = answer === this.question.answer;
    this.state.answers[comment.userId] = { answer, correct, nickname: comment.nickname, at: Date.now() };
    this.state.stats[answer] += 1;
    const player = this.state.players[comment.userId] ||= createPlayer(comment);
    player.nickname = comment.nickname; player.avatar = comment.avatar || player.avatar; player.answered += 1;
    if (correct) { player.score += this.scorePerCorrect; player.correct += 1; }
    this.state.recent.push({ userId: comment.userId, nickname: comment.nickname, answer, correct, score: player.score, ts: Date.now() });
    if (this.state.recent.length > 30) this.state.recent.shift();
    if (correct && this.mode === 'first_correct' && !this.state.winner) { this.state.winner = { ...comment, answer, awarded: this.scorePerCorrect, score: player.score }; this.state.phase = 'revealed'; this.clearTimers(); this.state.remaining = 0; this.notify(); this.scheduleNext(); return true; }
    this.notify(); return true;
  }
}
