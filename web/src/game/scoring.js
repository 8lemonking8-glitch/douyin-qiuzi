export function rankedPlayers(players, limit = 50) {
  return Object.values(players)
    .sort((a, b) => b.score - a.score || b.correct - a.correct || a.nickname.localeCompare(b.nickname, 'zh-CN'))
    .slice(0, limit);
}

export function createPlayer({ userId, nickname, avatar }) {
  return { id: userId, nickname, avatar, score: 0, correct: 0, answered: 0, streak: 0 };
}
