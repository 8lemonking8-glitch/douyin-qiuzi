import { QuizEngine } from './src/game/engine.js';
import { MockCommentProvider } from './src/adapters/mock-provider.js';
import { DycastCommentProvider } from './src/adapters/dycast-provider.js';
import { DirectDycastProvider } from './src/adapters/direct-dycast-provider.js';

const $ = id => document.getElementById(id);
const tauri = window.__TAURI__;
const escapeHtml = (value = '') => String(value).replace(/[&<>'"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[char]);
const questions = await fetch('./questions.json').then(response => { if (!response.ok) throw new Error('题库加载失败'); return response.json(); });
const engine = new QuizEngine(questions, { mode: 'first_correct', roundSeconds: 15, autoDelayMs: 3000, scorePerCorrect: 10, onChange: state => { render(state); tauri?.event?.emit('quiz-state', state).catch(() => {}); } });
const mockProvider = new MockCommentProvider(comment => engine.handleComment(comment));
const relayProvider = new DycastCommentProvider(payload => engine.handleDycastPayload(payload));
const directProvider = new DirectDycastProvider({ onComment: comment => engine.handleComment(comment), onStatus: status => engine.setDirectDycastStatus(status) });

function phaseText(state) { return ({ idle: '等待开始', answering: state.mode === 'first_correct' ? '抢答中' : '答题中', paused: '已暂停', revealed: '答案已公布' })[state.phase] || state.phase; }
function formatLastMessage(timestamp) { return timestamp ? new Date(timestamp).toLocaleTimeString('zh-CN', { hour12: false }) : '暂无'; }
function render(state) {
  const q = state.question;
  $('cur').textContent = state.idx + 1; $('total').textContent = state.total; $('phaseText').textContent = phaseText(state); $('question').textContent = q.question;
  for (const key of ['A', 'B', 'C', 'D']) { $('o' + key).textContent = q.options[key]; $('s' + key).textContent = state.stats[key]; }
  $('participantCount').textContent = state.participantCount; $('playerCount').textContent = state.playerCount; $('remaining').textContent = state.remaining; $('statsText').textContent = `A ${state.stats.A} · B ${state.stats.B} · C ${state.stats.C} · D ${state.stats.D}`; $('pauseBtn').textContent = state.phase === 'paused' ? '继续' : '暂停';
  const winner = $('winnerBox');
  if (state.winner) { winner.classList.remove('hidden'); winner.textContent = `🎉 ${state.winner.nickname} 抢答成功 · 正确答案 ${state.winner.answer} · +${state.winner.awarded} 分 · ${Math.round(state.autoDelayMs / 1000)} 秒后自动下一题`; }
  else if (state.phase === 'revealed') { winner.classList.remove('hidden'); winner.textContent = `✓ 正确答案：${q.answer} · ${q.options[q.answer]}`; } else winner.classList.add('hidden');
  $('leaderboard').innerHTML = state.leaderboard.length ? state.leaderboard.map((p, index) => `<div class="rank-row"><span>#${index + 1}</span><span>${escapeHtml(p.nickname)}</span><strong>${p.score} 分</strong></div>`).join('') : '<div class="empty">暂无数据</div>';
  $('recent').innerHTML = state.recent.length ? state.recent.map(item => `<div class="recent-item ${item.correct ? 'correct' : ''}"><b>${escapeHtml(item.nickname)}</b> · ${item.answer}<br><small>${item.correct ? `✓ 正确 +${state.scorePerCorrect}` : '✕ 错误'} · 当前 ${item.score} 分</small></div>`).join('') : '<div class="empty">等待答题…</div>';
  const status = $('dycastStatus');
  if (state.dycastError) { status.textContent = '弹幕连接异常'; status.className = 'pill error'; status.title = state.dycastError; } else if (state.dycastConnected > 0) { status.textContent = '直播间已连接'; status.className = 'pill live'; } else if (state.directDycastConnecting) { status.textContent = '正在连接直播间'; status.className = 'pill'; } else { status.textContent = '弹幕未连接'; status.className = 'pill'; }
  $('roomConnectionDetail').textContent = state.directDycastConnected ? `已连接房间 ${state.directDycastRoom || ''}` : state.directDycastConnecting ? `正在连接房间 ${state.directDycastRoom || ''}…` : state.dycastError || '尚未连接';
  $('lastMessage').textContent = formatLastMessage(state.dycastLastMessageAt);
}

$('startBtn').onclick = () => engine.startRound(); $('pauseBtn').onclick = () => engine.snapshot().phase === 'paused' ? engine.resume() : engine.pause(); $('revealBtn').onclick = () => engine.revealAnswer(false); $('nextBtn').onclick = () => engine.nextQuestion(true); $('prevBtn').onclick = () => engine.previousQuestion();
$('resetBtn').onclick = () => { if (confirm('确定重新开始并清空所有积分？')) engine.resetGame(); }; $('clearBoardBtn').onclick = () => { if (confirm('确定清空排行榜？')) engine.clearLeaderboard(); }; $('saveSettings').onclick = () => { engine.setMode($('modeSelect').value); engine.setRoundSeconds($('roundSeconds').value); engine.setAutoDelay($('autoDelay').value); engine.setScorePerCorrect($('scorePerCorrect').value); };
$('connectRoomBtn').onclick = async () => { $('roomConnectionDetail').textContent = '正在解析分享链接并连接直播间…'; try { await directProvider.start($('roomNumber').value); } catch (error) { engine.setDirectDycastStatus({ error: error.message }); } }; $('disconnectRoomBtn').onclick = () => directProvider.stop();
document.querySelectorAll('[data-answer]').forEach(button => button.onclick = () => mockProvider.send($('mockName').value.trim() || '测试观众', button.dataset.answer));
async function overlayCommand(command, args = {}) { try { await tauri?.core?.invoke(command, args); } catch (error) { alert(`Overlay 操作失败：${error}`); } }
$('showOverlay').onclick = () => overlayCommand('show_overlay'); $('hideOverlay').onclick = () => overlayCommand('hide_overlay'); $('topOverlay').onchange = event => overlayCommand('set_overlay_always_on_top', { enabled: event.target.checked }); $('clickthroughOverlay').onchange = async event => { await overlayCommand('set_overlay_clickthrough', { enabled: event.target.checked }); tauri?.event?.emit('overlay-edit-mode', !event.target.checked).catch(() => {}); };
if (tauri?.event?.listen) { await tauri.event.listen('dycast-payload', event => relayProvider.receive(event.payload)); await tauri.event.listen('dycast-status', event => engine.setDycastStatus(event.payload || {})); await tauri.event.listen('overlay-ready', () => tauri.event.emit('quiz-state', engine.snapshot())); }
mockProvider.start(); relayProvider.start(); engine.notify();
