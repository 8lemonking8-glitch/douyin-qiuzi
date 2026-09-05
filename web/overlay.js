import confetti from 'canvas-confetti';
import Chart from 'chart.js/auto';
const $ = id => document.getElementById(id);
const tauri = window.__TAURI__;
const escapeHtml = (value = '') => String(value).replace(/[&<>'"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[char]);

const MEDALS = ['🥇', '🥈', '🥉'];
let lastRankKey = null;
let lastWinnerShown = false;
let lastIdx = null;
let prevScores = {};
let rankInitialized = false;

function renderRank(list, speed) {
  const nextScores = {};
  for (const p of list) nextScores[p.id] = p.score;
  const flashed = new Set();
  if (rankInitialized) for (const p of list) if (p.score > (prevScores[p.id] ?? 0)) flashed.add(p.id);
  prevScores = nextScores;
  rankInitialized = true;
  const pinned = list.slice(0, 3);
  const rest = list.slice(3);
  $('rankPinned').innerHTML = list.length
    ? pinned.map((p, i) => `<div class="rank-row pinned${flashed.has(p.id) ? ' score-flash' : ''}"><span class="medal">${MEDALS[i]}</span><span>${escapeHtml(p.nickname)}</span><strong>${p.score}</strong></div>`).join('')
    : '<div class="empty">等待首位玩家</div>';
  const scroll = $('rankScroll');
  const track = $('rankTrack');
  scroll.classList.toggle('hidden', !rest.length);
  track.classList.remove('scrolling');
  track.style.animationDuration = '';
  if (!rest.length) { track.innerHTML = ''; return; }
  track.innerHTML = rest.map((p, i) => `<div class="rank-row${flashed.has(p.id) ? ' score-flash' : ''}"><span>${i + 4}</span><span>${escapeHtml(p.nickname)}</span><strong>${p.score}</strong></div>`).join('');
  const pxPerSec = Number.isFinite(Number(speed)) ? Number(speed) : 30;
  const copyHeight = track.scrollHeight;
  if (pxPerSec > 0 && copyHeight > scroll.clientHeight) {
    track.innerHTML += track.innerHTML;
    track.style.animationDuration = `${copyHeight / pxPerSec}s`;
    track.classList.add('scrolling');
  }
}

function celebrate() {
  const flash = $('flash');
  if (flash) {
    flash.classList.remove('flash-anim');
    void flash.offsetWidth;
    flash.classList.add('flash-anim');
  }
  const colors = ['#dc755e', '#efbd61', '#4f7d60', '#927cc5', '#d8a742', '#ffffff', '#679a73'];
  try {
    confetti({ particleCount: 130, spread: 80, startVelocity: 45, origin: { y: 0.55 }, colors, scalar: 1.05 });
    confetti({ particleCount: 70, angle: 60, spread: 60, origin: { x: 0, y: 0.7 }, colors });
    confetti({ particleCount: 70, angle: 120, spread: 60, origin: { x: 1, y: 0.7 }, colors });
  } catch {}
}

function triggerQuestionEnter() {
  const card = document.querySelector('.quiz-card');
  if (!card) return;
  card.classList.remove('q-enter');
  void card.offsetWidth;
  card.classList.add('q-enter');
}

let answerChart = null;
function updateChart(stats) {
  const canvas = $('answerChart');
  if (!canvas) return;
  if (!answerChart) {
    answerChart = new Chart(canvas, {
      type: 'bar',
      data: { labels: ['A', 'B', 'C', 'D'], datasets: [{ data: [stats.A, stats.B, stats.C, stats.D], backgroundColor: ['#df795f', '#d8a742', '#6fa278', '#927cc5'], borderRadius: 6, borderSkipped: false, barPercentage: 0.7 }] },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false }, tooltip: { enabled: false } },
        scales: {
          x: { grid: { display: false }, ticks: { color: '#96766b', font: { size: 14, weight: 'bold' } } },
          y: { beginAtZero: true, grid: { color: 'rgba(150,118,107,0.12)' }, ticks: { precision: 0, color: '#96766b', font: { size: 12 } } }
        },
        animation: { duration: 350, easing: 'easeOutQuart' }
      }
    });
  }
  answerChart.data.datasets[0].data = [stats.A, stats.B, stats.C, stats.D];
  answerChart.update();
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
  if (state.idx !== lastIdx) { lastIdx = state.idx; triggerQuestionEnter(); }
  const cd = $('countdown');
  if (state.phase === 'answering' && state.mode !== 'manual') {
    cd.classList.remove('hidden');
    $('cdNum').textContent = state.remaining;
    const ratio = state.roundSeconds > 0 ? state.remaining / state.roundSeconds : 0;
    $('cdFg').style.strokeDashoffset = String(138.23 * (1 - ratio));
    cd.classList.toggle('low', state.remaining <= 3);
  } else {
    cd.classList.add('hidden');
  }
  updateChart(state.stats);
  $('participants').textContent = `${state.participantCount} 人参与`;
  $('hint').textContent = state.phase === 'answering' ? (state.mode === 'first_correct' ? '🎤 评论发送 A / B / C / D 抢答' : `⏱ 剩余 ${state.remaining}s · 评论 A/B/C/D`) : state.phase === 'paused' ? '⏸ 本题已暂停' : '等待主播开始本题';
  const answerHint = $('answerHint');
  if (state.phase === 'answering') { answerHint.classList.remove('hidden'); answerHint.textContent = state.mode === 'first_correct' ? '📝 评论区发送 A / B / C / D 参与抢答' : `⏱ 剩余 ${state.remaining}s · 评论区发送 A / B / C / D`; }
  else if (state.phase === 'paused') { answerHint.classList.remove('hidden'); answerHint.textContent = '⏸ 本题已暂停'; }
  else answerHint.classList.add('hidden');
  const showWinner = Boolean(state.winner) || (state.phase === 'revealed' && Boolean(q.answer));
  if (showWinner && !lastWinnerShown) celebrate();
  lastWinnerShown = showWinner;
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
