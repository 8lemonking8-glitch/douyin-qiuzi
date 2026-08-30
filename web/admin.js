import { QuizEngine } from './src/game/engine.js';
import { DirectDycastProvider } from './src/adapters/direct-dycast-provider.js';
import questions from './questions.json';

const $ = id => document.getElementById(id);
const tauri = window.__TAURI__;
const escapeHtml = (value = '') => String(value).replace(/[&<>'"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[char]);
function syncOverlayState(state) {
  if (!tauri) return;
  // Native delivery targets the capture Overlay directly; the browser event is
  // retained as a compatibility fallback.
  void tauri.core?.invoke('sync_overlay_state', { state }).catch(error => console.error('Overlay state sync failed:', error));
  void tauri.event?.emit('quiz-state', state).catch(() => {});
}
const engine = new QuizEngine(questions, { mode: 'first_correct', roundSeconds: 15, autoDelayMs: 3000, scorePerCorrect: 10, onChange: state => { render(state); syncOverlayState(state); } });
const directProvider = new DirectDycastProvider({
  onComment: comment => engine.handleComment(comment),
  onStatus: status => engine.setDirectDycastStatus(status)
});

function phaseText(state) { return ({ idle: '等待开始', answering: state.mode === 'first_correct' ? '抢答中' : '答题中', paused: '已暂停', revealed: '答案已公布' })[state.phase] || state.phase; }
function formatLastMessage(timestamp) { return timestamp ? new Date(timestamp).toLocaleTimeString('zh-CN', { hour12: false }) : '暂无'; }
let lastSpokenId = null; let lastPhase = null;
function speakWord(word) { if (!('speechSynthesis' in window)) return; try { window.speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(word); u.lang = 'en-US'; u.rate = 0.9; window.speechSynthesis.speak(u); } catch {} }
function render(state) {
  const q = state.question;
  if (q) { const entered = state.phase === 'answering' && lastPhase !== 'answering' && lastPhase !== 'paused'; const isNew = q.id !== lastSpokenId; if ((entered || isNew) && $('autoSpeak').checked) speakWord(q.question.replace(/ 含义？$/, '')); if (q.id !== lastSpokenId) lastSpokenId = q.id; lastPhase = state.phase; }
  $('cur').textContent = state.idx + 1; $('total').textContent = state.total; $('phaseText').textContent = phaseText(state); $('levelTag').textContent = state.activeLevelLabel || '全部题库'; $('question').textContent = q.question; $('appMeta').textContent = state.activeLevelLabel + ' · ' + state.total + ' 题'; $('remainingWrap').classList.toggle('hidden', state.mode !== 'timer'); $('startBtn').disabled = state.phase === 'answering' || state.phase === 'paused'; $('pauseBtn').disabled = state.phase !== 'answering' && state.phase !== 'paused'; $('revealBtn').disabled = state.phase !== 'answering' && state.phase !== 'paused'; $('roundSeconds').disabled = state.mode !== 'timer'; $('autoDelay').disabled = state.mode === 'manual';
  for (const key of ['A', 'B', 'C', 'D']) { $('o' + key).textContent = q.options[key]; $('s' + key).textContent = state.stats[key]; const opt = document.querySelector('.option-' + key.toLowerCase()); opt.classList.toggle('is-correct', state.phase === 'revealed' && q.answer === key); opt.classList.toggle('is-wrong', state.phase === 'revealed' && q.answer !== key); }
  $('participantCount').textContent = state.participantCount; $('playerCount').textContent = state.playerCount; $('remaining').textContent = state.remaining; $('statsText').textContent = `A ${state.stats.A} · B ${state.stats.B} · C ${state.stats.C} · D ${state.stats.D}`; $('pauseBtn').textContent = state.phase === 'paused' ? '继续' : '暂停';
  const winner = $('winnerBox');
  if (state.winner) { winner.classList.remove('hidden'); winner.textContent = `🎉 ${state.winner.nickname} 抢答成功 · 正确答案 ${state.winner.answer} · +${state.winner.awarded} 分 · ${Math.round(state.autoDelayMs / 1000)} 秒后自动下一题`; }
  else if (state.phase === 'revealed') { winner.classList.remove('hidden'); winner.textContent = `✓ 正确答案：${q.answer} · ${q.options[q.answer]}`; } else winner.classList.add('hidden');
  $('leaderboard').innerHTML = state.leaderboard.length ? state.leaderboard.map((p, index) => `<div class="rank-row"><span>#${index + 1}</span><span>${escapeHtml(p.nickname)}</span><strong>${p.score} 分</strong></div>`).join('') : '<div class="empty">暂无数据</div>';
  $('recent').innerHTML = state.recent.length ? state.recent.map(item => `<div class="recent-item ${item.correct ? 'correct' : ''}"><b>${escapeHtml(item.nickname)}</b> · ${item.answer}<br><small>${item.correct ? `✓ 正确 +${state.scorePerCorrect}` : '✕ 错误'} · 当前 ${item.score} 分</small></div>`).join('') : '<div class="empty">等待答题…</div>';
  $('commentCount').textContent = state.comments.length + ' 条';
  $('comments').innerHTML = state.comments.length ? state.comments.map(item => '<div class="recent-item"><b>' + escapeHtml(item.nickname) + '</b><br><span>' + escapeHtml(item.content) + '</span><br><small>' + new Date(item.ts).toLocaleTimeString('zh-CN', { hour12: false }) + '</small></div>').join('') : '<div class="empty">等待直播评论…</div>';
  const status = $('dycastStatus');
  if (state.directDycastConnected > 0) { status.textContent = '内置 Dycast 已连接'; status.className = 'pill live'; status.title = ''; }
  else if (state.directDycastConnecting) { status.textContent = '内置 Dycast 连接中'; status.className = 'pill'; status.title = ''; }
  else if (state.dycastError) { status.textContent = 'Dycast 连接异常'; status.className = 'pill error'; status.title = state.dycastError; }
  else { status.textContent = '等待 Dycast 连接'; status.className = 'pill'; status.title = ''; }
  $('roomConnectionDetail').textContent = state.dycastError || (state.directDycastConnected > 0 ? '内置 Dycast 已连接，正在接收弹幕。' : '请输入公开网页直播间地址后连接。');
  $('lastMessage').textContent = formatLastMessage(state.dycastLastMessageAt);
  if (state.directDycastDetail) $('roomConnectionDetail').textContent = state.directDycastDetail;
  if (state.directDycastRoom && document.activeElement !== $('roomNumber')) $('roomNumber').value = state.directDycastRoom;
}

$('startBtn').onclick = () => engine.startRound(); $('pauseBtn').onclick = () => engine.snapshot().phase === 'paused' ? engine.resume() : engine.pause(); $('revealBtn').onclick = () => engine.revealAnswer(false); $('nextBtn').onclick = () => engine.nextQuestion(true); $('prevBtn').onclick = () => engine.previousQuestion(); $('shuffleBtn').onclick = () => engine.shuffleQuestions();
$('resetBtn').onclick = () => { if (confirm('确定重新开始并清空所有积分？')) engine.resetGame(); }; $('clearBoardBtn').onclick = () => { if (confirm('确定清空排行榜？')) engine.clearLeaderboard(); };
$('levelSelect').onchange = () => engine.filterByLevel($('levelSelect').value); $('modeSelect').onchange = () => engine.setMode($('modeSelect').value); $('roundSeconds').onchange = () => engine.setRoundSeconds($('roundSeconds').value); $('autoDelay').onchange = () => engine.setAutoDelay($('autoDelay').value); $('scorePerCorrect').onchange = () => engine.setScorePerCorrect($('scorePerCorrect').value);
async function overlayCommand(command, args = {}) { try { await tauri?.core?.invoke(command, args); } catch (error) { alert(`Overlay 操作失败：${error}`); } }
$('offscreenOverlay').onchange = event => overlayCommand('set_overlay_offscreen', { offscreen: event.target.checked }); $('topOverlay').onchange = event => overlayCommand('set_overlay_always_on_top', { enabled: event.target.checked }); $('clickthroughOverlay').onchange = async event => { await overlayCommand('set_overlay_clickthrough', { enabled: event.target.checked }); tauri?.event?.emit('overlay-edit-mode', !event.target.checked).catch(() => {}); };
if (tauri?.event?.listen) { await tauri.event.listen('overlay-ready', () => tauri.event.emit('quiz-state', engine.snapshot())); }
$('connectRoomBtn').onclick = async () => {
  const button = $('connectRoomBtn');
  const roomInput = $('roomNumber');
  button.disabled = true;
  roomInput.disabled = true;
  try {
    await directProvider.start(roomInput.value);
  } catch (error) {
    const detail = error && error.message ? error.message : String(error);
    engine.setDirectDycastStatus({ connected: 0, connecting: false, error: detail, detail });
  } finally {
    button.disabled = false;
    roomInput.disabled = false;
  }
};
$('disconnectRoomBtn').onclick = () => directProvider.stop();

engine.notify();
