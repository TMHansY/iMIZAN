// A simple, deterministic string hash — same input always produces the same number.
const hashString = (str) => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
};

// A seeded pseudo-random number generator (mulberry32) — given the same
// seed, always produces the same sequence of "random" numbers.
const seededRandom = (seed) => {
  let t = seed;
  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
};

// Shuffles `array` deterministically based on `seedString` — same seed
// always produces the same order, different seeds produce different orders.
export const seededShuffle = (array, seedString) => {
  const random = seededRandom(hashString(seedString));
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
};