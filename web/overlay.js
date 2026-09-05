const $ = id => document.getElementById(id);
const tauri = window.__TAURI__;
const escapeHtml = (value = '') => String(value).replace(/[&<>'"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[char]);

const MEDALS = ['🥇', '🥈', '🥉'];
let lastRankKey = null;

function renderRank(list, speed) {
  const pinned = list.slice(0, 3);
  const rest = list.slice(3);
  $('rankPinned').innerHTML = list.length
    ? pinned.map((p, i) => `<div class="rank-row pinned"><span class="medal">${MEDALS[i]}</span><span>${escapeHtml(p.nickname)}</span><strong>${p.score}</strong></div>`).join('')
    : '<div class="empty">等待首位玩家</div>';
  const scroll = $('rankScroll');
  const track = $('rankTrack');
  scroll.classList.toggle('hidden', !rest.length);
  track.classList.remove('scrolling');
  track.style.animationDuration = '';
  if (!rest.length) { track.innerHTML = ''; return; }
  track.innerHTML = rest.map((p, i) => `<div class="rank-row"><span>${i + 4}</span><span>${escapeHtml(p.nickname)}</span><strong>${p.score}</strong></div>`).join('');
  const pxPerSec = Number.isFinite(Number(speed)) ? Number(speed) : 30;
  const copyHeight = track.scrollHeight;
  if (pxPerSec > 0 && copyHeight > scroll.clientHeight) {
    track.innerHTML += track.innerHTML;
    track.style.animationDuration = `${copyHeight / pxPerSec}s`;
    track.classList.add('scrolling');
  }
}

function render(state) {
  if (!state) return;
  document.body.classList.toggle('fullscreen', Boolean(state.fullscreenOverlay));
  if (!state.question) return;
  const q = state.question;
  $('progress').textContent = `${state.idx + 1} / ${state.total}`;
  $('levelTag').textContent = state.activeLevelLabel || '全部';
  $('q').textContent = q.question.replace(/ 含义？$/, '');
  $('qMeta').textContent = [state.phase === 'revealed' && q.pos, q.phonetic].filter(Boolean).join('  ');
  for (const key of ['A', 'B', 'C', 'D']) $(key.toLowerCase()).textContent = q.options[key];
  $('participants').textContent = `${state.participantCount} 人参与`;
  $('hint').textContent = state.phase === 'answering' ? (state.mode === 'first_correct' ? '🎤 评论发送 A / B / C / D 抢答' : `⏱ 剩余 ${state.remaining}s · 评论 A/B/C/D`) : state.phase === 'paused' ? '⏸ 本题已暂停' : '等待主播开始本题';
  const answerHint = $('answerHint');
  if (state.phase === 'answering') { answerHint.classList.remove('hidden'); answerHint.textContent = state.mode === 'first_correct' ? '📝 评论区发送 A / B / C / D 参与抢答' : `⏱ 剩余 ${state.remaining}s · 评论区发送 A / B / C / D`; }
  else if (state.phase === 'paused') { answerHint.classList.remove('hidden'); answerHint.textContent = '⏸ 本题已暂停'; }
  else answerHint.classList.add('hidden');
  const winner = $('winner');
  if (state.winner) { winner.classList.remove('hidden'); $('winnerLabel').textContent = '抢答成功'; $('winnerName').textContent = state.winner.nickname; $('winnerAnswer').textContent = `正确答案：${state.winner.answer}（${q.options[state.winner.answer]}）`; $('winnerScore').textContent = `+${state.winner.awarded} 分`; $('nextTip').textContent = `${Math.round(state.autoDelayMs / 1000)} 秒后自动下一题…`; }
  else if (state.phase === 'revealed' && q.answer) { winner.classList.remove('hidden'); const lastCorrect = (state.recent || []).find(r => r.correct); $('winnerLabel').textContent = '正确答案'; $('winnerName').textContent = lastCorrect ? `${lastCorrect.nickname} +${state.scorePerCorrect} 分` : q.options[q.answer]; $('winnerAnswer').textContent = `✓ ${q.answer}`; $('winnerScore').textContent = ''; $('nextTip').textContent = state.mode === 'manual' ? '等待主播切题' : `${Math.round(state.autoDelayMs / 1000)} 秒后自动下一题…`; }
  else winner.classList.add('hidden');
  const list = state.leaderboard || [];
  const rankKey = JSON.stringify(list) + '|' + state.leaderboardScrollSpeed;
  if (rankKey !== lastRankKey) { lastRankKey = rankKey; renderRank(list, state.leaderboardScrollSpeed); }
}
if (tauri?.event?.listen) { await tauri.event.listen('quiz-state', event => render(event.payload)); await tauri.event.listen('overlay-edit-mode', event => $('editBar').classList.toggle('hidden', !event.payload)); }
// Read the last native snapshot too. This covers an Overlay which is still
// loading when the first correct-answer event is sent.
if (tauri?.core?.invoke) {
  try {
    const state = await tauri.core.invoke('get_overlay_state');
    if (state) render(state);
  } catch (error) {
    console.error('Overlay initial-state sync failed:', error);
  }
}
$('editBar').addEventListener('mousedown', () => tauri?.core?.invoke('start_overlay_dragging').catch(() => {}));
tauri?.event?.emit('overlay-ready', true).catch(() => {});
