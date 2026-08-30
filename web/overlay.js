const $ = id => document.getElementById(id);
const tauri = window.__TAURI__;
const escapeHtml = (value = '') => String(value).replace(/[&<>'"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[char]);

function render(state) {
  if (!state?.question) return;
  const q = state.question;
  $('progress').textContent = `${state.idx + 1} / ${state.total}`;
  $('q').textContent = q.question;
  for (const key of ['A', 'B', 'C', 'D']) $(key.toLowerCase()).textContent = q.options[key];
  $('participants').textContent = `${state.participantCount} 人参与`;
  $('hint').textContent = state.phase === 'answering' ? (state.mode === 'first_correct' ? '🎤 评论发送 A / B / C / D 抢答' : `⏱ 剩余 ${state.remaining}s · 评论 A/B/C/D`) : state.phase === 'paused' ? '⏸ 本题已暂停' : '等待主播开始本题';
  const winner = $('winner');
  if (state.winner) { winner.classList.remove('hidden'); $('winnerName').textContent = state.winner.nickname; $('winnerAnswer').textContent = `✓ 正确答案 ${state.winner.answer} · ${q.options[state.winner.answer]}`; $('winnerScore').textContent = `+${state.winner.awarded} 分`; $('nextTip').textContent = `${Math.round(state.autoDelayMs / 1000)} 秒后自动下一题…`; }
  else if (state.phase === 'revealed' && q.answer) { winner.classList.remove('hidden'); $('winnerName').textContent = '正确答案'; $('winnerAnswer').textContent = `✓ ${q.answer} · ${q.options[q.answer]}`; $('winnerScore').textContent = ''; $('nextTip').textContent = state.mode === 'manual' ? '等待主播切题' : `${Math.round(state.autoDelayMs / 1000)} 秒后自动下一题…`; }
  else winner.classList.add('hidden');
  const list = state.leaderboard || [];
  $('rankList').innerHTML = list.length ? list.slice(0, 5).map((p, index) => `<div class="rank-row"><span>${index + 1}</span><span>${escapeHtml(p.nickname)}</span><strong>${p.score}</strong></div>`).join('') : '<div class="empty">等待首位玩家</div>';
}
if (tauri?.event?.listen) { await tauri.event.listen('quiz-state', event => render(event.payload)); await tauri.event.listen('overlay-edit-mode', event => $('editBar').classList.toggle('hidden', !event.payload)); }
$('editBar').addEventListener('mousedown', () => tauri?.core?.invoke('start_overlay_dragging').catch(() => {}));
tauri?.event?.emit('overlay-ready', true).catch(() => {});
