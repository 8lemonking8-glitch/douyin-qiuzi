import { QuizEngine } from './src/game/engine.js';
import { DirectDycastProvider } from './src/adapters/direct-dycast-provider.js';
import questions from './questions.json';
import * as Tone from 'tone';

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
const SETTINGS_STORAGE_KEY = 'douyin-live-quiz.settings.v1';
const SAVED_SETTING_IDS = ['roomNumber', 'levelSelect', 'modeSelect', 'roundSeconds', 'autoDelay', 'scorePerCorrect', 'autoSpeak', 'offscreenOverlay', 'portraitOverlay', 'clickthroughOverlay', 'topOverlay', 'leaderboardScrollSpeed', 'leaderboardLimit', 'fullscreenOverlay'];

function collectSettings() {
  return Object.fromEntries(SAVED_SETTING_IDS.map(id => {
    const element = $(id);
    return [id, element.type === 'checkbox' ? element.checked : element.value];
  }));
}

function applySettings(saved) {
  if (!saved || typeof saved !== 'object') return;
  for (const id of SAVED_SETTING_IDS) {
    if (!(id in saved)) continue;
    const element = $(id);
    if (element.type === 'checkbox') element.checked = Boolean(saved[id]);
    else element.value = String(saved[id]);
  }
  engine.filterByLevel($('levelSelect').value);
  engine.setMode($('modeSelect').value);
  engine.setRoundSeconds($('roundSeconds').value);
  engine.setAutoDelay($('autoDelay').value);
  engine.setScorePerCorrect($('scorePerCorrect').value);
  engine.setLeaderboardScrollSpeed($('leaderboardScrollSpeed').value);
  engine.setLeaderboardLimit($('leaderboardLimit').value);
  engine.setFullscreenOverlay($('fullscreenOverlay').checked);
  void overlayCommand('set_overlay_offscreen', { offscreen: $('offscreenOverlay').checked });
  void overlayCommand('set_overlay_orientation', { portrait: $('portraitOverlay').checked });
  void overlayCommand('set_overlay_clickthrough', { enabled: $('clickthroughOverlay').checked });
  void overlayCommand('set_overlay_always_on_top', { enabled: $('topOverlay').checked });
}

function saveSettings() {
  try {
    const settings = collectSettings();
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
    // Native storage is deliberately outside the installation directory, so a
    // normal NSIS upgrade neither needs an uninstall nor loses user settings.
    void tauri?.core?.invoke('save_persistent_settings', { settings }).catch(error => console.warn('Unable to save persistent settings:', error));
  } catch (error) {
    console.warn('Unable to save settings:', error);
  }
}

async function restoreSettings() {
  try {
    const nativeSettings = await tauri?.core?.invoke('load_persistent_settings');
    if (nativeSettings && typeof nativeSettings === 'object') {
      applySettings(nativeSettings);
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(nativeSettings));
      return;
    }
    const legacySettings = JSON.parse(localStorage.getItem(SETTINGS_STORAGE_KEY) || '{}');
    applySettings(legacySettings);
    if (Object.keys(legacySettings).length) saveSettings();
  } catch (error) {
    console.warn('Unable to restore settings:', error);
  }
}

function phaseText(state) { return ({ idle: '等待开始', answering: state.mode === 'first_correct' ? '抢答中' : '答题中', paused: '已暂停', revealed: '答案已公布' })[state.phase] || state.phase; }
function formatLastMessage(timestamp) { return timestamp ? new Date(timestamp).toLocaleTimeString('zh-CN', { hour12: false }) : '暂无'; }
let lastPhase = null;
function speakWord(word) { try { new Audio('https://dict.youdao.com/dictvoice?audio=' + encodeURIComponent(word) + '&type=1').play().catch(() => {}); } catch {} }
let lastRecentTs = null;
let toneReady = false; let correctSynth = null; let wrongSynth = null;
function ensureTone() {
  if (toneReady) return;
  try {
    Tone.start();
    correctSynth = new Tone.Synth({ oscillator: { type: 'triangle' }, envelope: { attack: 0.004, decay: 0.4, sustain: 0, release: 0.3 } }).toDestination();
    wrongSynth = new Tone.Synth({ oscillator: { type: 'sawtooth' }, envelope: { attack: 0.008, decay: 0.3, sustain: 0.08, release: 0.2 }, volume: -8 }).toDestination();
    toneReady = true;
  } catch {}
}
function playSound(correct) { try { ensureTone(); if (!toneReady) return; const now = Tone.now(); if (correct) { correctSynth.triggerAttackRelease('C5', 0.16, now); correctSynth.triggerAttackRelease('G5', 0.4, now + 0.11); } else { wrongSynth.triggerAttackRelease('A3', 0.22, now); wrongSynth.triggerAttackRelease('E3', 0.35, now + 0.13); } } catch {} }
function render(state) {
  const q = state.question;
  if (q) { const entered = state.phase === 'answering' && lastPhase !== 'answering' && lastPhase !== 'paused'; if (entered && $('autoSpeak').checked) speakWord(q.question.replace(/ 含义？$/, '')); lastPhase = state.phase; }
  $('cur').textContent = state.idx + 1; $('total').textContent = state.total; $('phaseText').textContent = phaseText(state); $('levelTag').textContent = state.activeLevelLabel || '全部题库'; $('question').textContent = q.question.replace(/ 含义？$/, ''); $('questionMeta').textContent = [q.pos, q.phonetic].filter(Boolean).join('  '); $('appMeta').textContent = state.activeLevelLabel + ' · ' + state.total + ' 题'; $('remainingWrap').classList.toggle('hidden', state.mode === 'manual' || state.phase !== 'answering'); $('startBtn').disabled = state.phase === 'answering' || state.phase === 'paused'; $('pauseBtn').disabled = state.phase !== 'answering' && state.phase !== 'paused'; $('revealBtn').disabled = state.phase !== 'answering' && state.phase !== 'paused'; $('roundSeconds').disabled = state.mode === 'manual'; $('autoDelay').disabled = state.mode === 'manual';
  for (const key of ['A', 'B', 'C', 'D']) { $('o' + key).textContent = q.options[key]; $('s' + key).textContent = state.stats[key]; const opt = document.querySelector('.option-' + key.toLowerCase()); opt.classList.toggle('is-correct', state.phase === 'revealed' && q.answer === key); opt.classList.toggle('is-wrong', state.phase === 'revealed' && q.answer !== key); }
  $('participantCount').textContent = state.participantCount; $('playerCount').textContent = state.playerCount; $('remaining').textContent = state.remaining; $('statsText').textContent = `A ${state.stats.A} · B ${state.stats.B} · C ${state.stats.C} · D ${state.stats.D}`; $('pauseBtn').textContent = state.phase === 'paused' ? '继续' : '暂停';
  const winner = $('winnerBox');
  if (state.winner) { winner.classList.remove('hidden'); winner.textContent = `🎉 ${state.winner.nickname} 抢答成功 · 正确答案 ${state.winner.answer} · +${state.winner.awarded} 分 · ${Math.round(state.autoDelayMs / 1000)} 秒后自动下一题`; }
  else if (state.phase === 'revealed') { winner.classList.remove('hidden'); winner.textContent = `✓ 正确答案：${q.answer} · ${q.options[q.answer]}`; } else winner.classList.add('hidden');
  $('leaderboard').innerHTML = state.leaderboard.length ? state.leaderboard.map((p, index) => `<div class="rank-row"><span>#${index + 1}</span><span>${escapeHtml(p.nickname)}</span><strong>${p.score} 分</strong></div>`).join('') : '<div class="empty">暂无数据</div>';
  $('recent').innerHTML = state.recent.length ? state.recent.map(item => `<div class="recent-item ${item.correct ? 'correct' : ''}"><b>${escapeHtml(item.nickname)}</b> · ${item.answer}<br><small>${item.correct ? `✓ 正确 +${state.scorePerCorrect}` : '✕ 错误'} · 当前 ${item.score} 分</small></div>`).join('') : '<div class="empty">等待答题…</div>';
  if (state.recent[0] && state.recent[0].ts !== lastRecentTs) { lastRecentTs = state.recent[0].ts; playSound(state.recent[0].correct); }
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
$('levelSelect').onchange = () => { engine.filterByLevel($('levelSelect').value); saveSettings(); }; $('modeSelect').onchange = () => { engine.setMode($('modeSelect').value); saveSettings(); }; $('roundSeconds').onchange = () => { engine.setRoundSeconds($('roundSeconds').value); saveSettings(); }; $('autoDelay').onchange = () => { engine.setAutoDelay($('autoDelay').value); saveSettings(); }; $('scorePerCorrect').onchange = () => { engine.setScorePerCorrect($('scorePerCorrect').value); saveSettings(); }; $('leaderboardScrollSpeed').onchange = () => { engine.setLeaderboardScrollSpeed($('leaderboardScrollSpeed').value); saveSettings(); }; $('leaderboardLimit').onchange = () => { engine.setLeaderboardLimit($('leaderboardLimit').value); saveSettings(); }; $('fullscreenOverlay').onchange = () => { engine.setFullscreenOverlay($('fullscreenOverlay').checked); saveSettings(); }; $('autoSpeak').onchange = saveSettings;
async function overlayCommand(command, args = {}) { try { await tauri?.core?.invoke(command, args); } catch (error) { alert(`Overlay 操作失败：${error}`); } }
$('offscreenOverlay').onchange = event => { overlayCommand('set_overlay_offscreen', { offscreen: event.target.checked }); saveSettings(); }; $('portraitOverlay').onchange = event => { overlayCommand('set_overlay_orientation', { portrait: event.target.checked }); saveSettings(); }; $('topOverlay').onchange = event => { overlayCommand('set_overlay_always_on_top', { enabled: event.target.checked }); saveSettings(); }; $('clickthroughOverlay').onchange = async event => { await overlayCommand('set_overlay_clickthrough', { enabled: event.target.checked }); tauri?.event?.emit('overlay-edit-mode', !event.target.checked).catch(() => {}); saveSettings(); };
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
    saveSettings();
  }
};
$('disconnectRoomBtn').onclick = () => directProvider.stop();

$('roomNumber').addEventListener('input', saveSettings);
void restoreSettings().finally(() => engine.notify());

// ---- Dev-only test tools (toggle with Ctrl+Shift+D) ----
const DEV_STORAGE_KEY = 'douyin-live-quiz.dev-mode.v1';
const devId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

function toggleDevPanel(force) {
  const show = typeof force === 'boolean' ? force : $('devPanel').classList.contains('hidden');
  $('devPanel').classList.toggle('hidden', !show);
  try { localStorage.setItem(DEV_STORAGE_KEY, show ? '1' : '0'); } catch {}
}

window.addEventListener('keydown', event => {
  if (event.ctrlKey && event.shiftKey && event.key && event.key.toLowerCase() === 'd') {
    event.preventDefault();
    toggleDevPanel();
  }
});

function devEnsureAnswering() {
  const phase = engine.snapshot().phase;
  if (phase === 'idle' || phase === 'revealed') engine.startRound();
  else if (phase === 'paused') engine.resume();
}

function devComment(content) {
  return { userId: `dev-${devId()}`, nickname: `观众${1000 + Math.floor(Math.random() * 9000)}`, content, eventId: `dev-evt-${devId()}` };
}

function devSimulateAnswers(count, correctPercent) {
  devEnsureAnswering();
  const answer = engine.question.answer;
  const wrong = ['A', 'B', 'C', 'D'].filter(k => k !== answer);
  for (let i = 0; i < count; i++) {
    const correct = Math.random() * 100 < correctPercent;
    engine.handleComment(devComment(correct ? answer : wrong[Math.floor(Math.random() * wrong.length)]));
  }
}

function devSimulateWin() {
  devEnsureAnswering();
  engine.handleComment(devComment(engine.question.answer));
}

function devSeedLeaderboard(count) {
  const stamp = Date.now();
  for (let i = 0; i < count; i++) {
    const uid = `dev-seed-${stamp}-${i}`;
    engine.state.players[uid] = { id: uid, nickname: `玩家${1000 + i}`, avatar: '', score: Math.floor(Math.random() * 30) * 10, correct: Math.floor(Math.random() * 25), answered: 20 + Math.floor(Math.random() * 30) };
  }
  engine.notify();
}

let devAutoTimer = null;
function toggleAutoDemo() {
  const button = $('devAutoBtn');
  if (devAutoTimer) { clearInterval(devAutoTimer); devAutoTimer = null; button.textContent = '开始自动演示'; button.classList.remove('danger'); return; }
  devEnsureAnswering();
  button.textContent = '停止自动演示';
  button.classList.add('danger');
  devAutoTimer = setInterval(() => {
    const phase = engine.snapshot().phase;
    if (phase === 'answering') devSimulateWin();
    else if (phase === 'idle' || phase === 'revealed') engine.startRound();
  }, 2200);
}

$('devSimulateBtn').onclick = () => devSimulateAnswers(Number($('devSimCount').value) || 5, Number($('devSimCorrect').value) || 0);
$('devSeedBtn').onclick = () => devSeedLeaderboard(Number($('devSeedCount').value) || 50);
$('devWinBtn').onclick = devSimulateWin;
$('devAutoBtn').onclick = toggleAutoDemo;
$('devClearBtn').onclick = () => engine.clearLeaderboard();
$('closeDevBtn').onclick = () => toggleDevPanel(false);
if (localStorage.getItem(DEV_STORAGE_KEY) === '1') $('devPanel').classList.remove('hidden');
