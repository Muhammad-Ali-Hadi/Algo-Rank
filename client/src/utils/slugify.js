export const generateProblemSlug = (title) => {
  if (!title) return '';
  const clean = title.toLowerCase().replace(/[^a-z0-9\s-]/g, '').trim();
  const words = clean.split(/\s+/).filter(Boolean);
  if (words.length > 3) {
    return words.map(w => w[0]).join('');
  }
  return words.join('-');
};
