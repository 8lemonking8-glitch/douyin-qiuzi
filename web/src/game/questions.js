/** Converts legacy q/ans questions and the documented question/options schema. */
export function normalizeQuestions(input) {
  if (!Array.isArray(input)) return [];
  return input.map((item, index) => {
    const options = item.options || item;
    const answer = String(item.answer || item.ans || '').trim().toUpperCase();
    return {
      id: item.id ?? index + 1,
      level: String(item.level || 'general'),
      question: String(item.question || item.q || ''),
      options: {
        A: String(options.A || ''), B: String(options.B || ''),
        C: String(options.C || ''), D: String(options.D || '')
      },
      answer: /^[ABCD]$/.test(answer) ? answer : 'A',
      pos: String(item.pos || ''),
      phonetic: String(item.phonetic || '')
    };
  }).filter(question => question.question && Object.values(question.options).every(Boolean));
}
