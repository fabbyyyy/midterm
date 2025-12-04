export function levenshteinDistance(str1: string, str2: string): number {
  if (str1 === str2) return 0;
  if (str1.length === 0) return str2.length;
  if (str2.length === 0) return str1.length;

  let s1 = str1;
  let s2 = str2;
  if (s1.length > s2.length) {
    [s1, s2] = [s2, s1];
  }

  const len1 = s1.length;
  const len2 = s2.length;

  let prevRow = Array.from({ length: len1 + 1 }, (_, i) => i);
  let currRow = Array(len1 + 1);

  for (let i = 1; i <= len2; i++) {
    currRow[0] = i;

    for (let j = 1; j <= len1; j++) {
      const cost = s1[j - 1] === s2[i - 1] ? 0 : 1;

      currRow[j] = Math.min(
        prevRow[j] + 1,      
        currRow[j - 1] + 1,  
        prevRow[j - 1] + cost 
      );
    }

    [prevRow, currRow] = [currRow, prevRow];
  }

  return prevRow[len1];
}

export function levenshteinSimilarity(str1: string, str2: string): number {
  const maxLen = Math.max(str1.length, str2.length);
  if (maxLen === 0) return 1.0;

  const distance = levenshteinDistance(str1, str2);
  return 1 - distance / maxLen;
}

export function jaroDistance(str1: string, str2: string): number {
  if (str1 === str2) return 1.0;
  if (str1.length === 0 && str2.length === 0) return 1.0;
  if (str1.length === 0 || str2.length === 0) return 0.0;

  const maxDist = Math.floor(Math.max(str1.length, str2.length) / 2) - 1;

  const s1Matches = new Array(str1.length).fill(false);
  const s2Matches = new Array(str2.length).fill(false);

  let matches = 0;
  let transpositions = 0;

  for (let i = 0; i < str1.length; i++) {
    const start = Math.max(0, i - maxDist);
    const end = Math.min(i + maxDist + 1, str2.length);

    for (let j = start; j < end; j++) {
      if (s2Matches[j] || str1[i] !== str2[j]) continue;
      s1Matches[i] = true;
      s2Matches[j] = true;
      matches++;
      break;
    }
  }

  if (matches === 0) return 0.0;

  let k = 0;
  for (let i = 0; i < str1.length; i++) {
    if (!s1Matches[i]) continue;

    while (!s2Matches[k]) k++;

    if (str1[i] !== str2[k]) transpositions++;
    k++;
  }

  return (
    (matches / str1.length +
      matches / str2.length +
      (matches - transpositions / 2) / matches) /
    3
  );
}

export function jaroWinklerSimilarity(
  str1: string,
  str2: string,
  prefixScale: number = 0.1
): number {
  const jaroSim = jaroDistance(str1, str2);

  let prefixLen = 0;
  const maxPrefix = Math.min(4, Math.min(str1.length, str2.length));

  for (let i = 0; i < maxPrefix; i++) {
    if (str1[i] === str2[i]) {
      prefixLen++;
    } else {
      break;
    }
  }

  return jaroSim + prefixLen * prefixScale * (1 - jaroSim);
}

export function diceCoefficientSimilarity(str1: string, str2: string): number {
  if (str1 === str2) return 1.0;
  if (str1.length < 2 || str2.length < 2) return 0.0;

  const bigrams1 = getBigrams(str1);
  const bigrams2 = getBigrams(str2);

  if (bigrams1.size === 0 && bigrams2.size === 0) return 1.0;
  if (bigrams1.size === 0 || bigrams2.size === 0) return 0.0;

  let intersection = 0;
  for (const bigram of bigrams1.keys()) {
    const count1 = bigrams1.get(bigram)!;
    const count2 = bigrams2.get(bigram) || 0;
    intersection += Math.min(count1, count2);
  }

  const total1 = Array.from(bigrams1.values()).reduce((a, b) => a + b, 0);
  const total2 = Array.from(bigrams2.values()).reduce((a, b) => a + b, 0);

  return (2 * intersection) / (total1 + total2);
}

function getBigrams(str: string): Map<string, number> {
  const bigrams = new Map<string, number>();

  for (let i = 0; i < str.length - 1; i++) {
    const bigram = str.substring(i, i + 2);
    bigrams.set(bigram, (bigrams.get(bigram) || 0) + 1);
  }

  return bigrams;
}

export function cosineSimilarity(str1: string, str2: string): number {
  const words1 = tokenize(str1);
  const words2 = tokenize(str2);

  if (words1.length === 0 && words2.length === 0) return 1.0;
  if (words1.length === 0 || words2.length === 0) return 0.0;

  const allWords = new Set([...words1, ...words2]);
  const vector1: number[] = [];
  const vector2: number[] = [];

  for (const word of allWords) {
    vector1.push(words1.filter(w => w === word).length);
    vector2.push(words2.filter(w => w === word).length);
  }

  let dotProduct = 0;
  let magnitude1 = 0;
  let magnitude2 = 0;

  for (let i = 0; i < vector1.length; i++) {
    dotProduct += vector1[i] * vector2[i];
    magnitude1 += vector1[i] * vector1[i];
    magnitude2 += vector2[i] * vector2[i];
  }

  if (magnitude1 === 0 || magnitude2 === 0) return 0.0;

  return dotProduct / (Math.sqrt(magnitude1) * Math.sqrt(magnitude2));
}

function tokenize(str: string): string[] {
  return str
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 0);
}

export function compositeSimilarity(
  str1: string,
  str2: string,
  weights: {
    levenshtein?: number;
    jaroWinkler?: number;
    dice?: number;
    cosine?: number;
  } = {}
): number {
  const defaultWeights = {
    levenshtein: 0.3,
    jaroWinkler: 0.3,
    dice: 0.2,
    cosine: 0.2,
  };

  const w = { ...defaultWeights, ...weights };

  const similarities = {
    levenshtein: levenshteinSimilarity(str1, str2),
    jaroWinkler: jaroWinklerSimilarity(str1, str2),
    dice: diceCoefficientSimilarity(str1, str2),
    cosine: cosineSimilarity(str1, str2),
  };

  return (
    similarities.levenshtein * w.levenshtein! +
    similarities.jaroWinkler * w.jaroWinkler! +
    similarities.dice * w.dice! +
    similarities.cosine * w.cosine!
  );
}

export function findMostSimilar(
  target: string,
  candidates: string[],
  algorithm: 'levenshtein' | 'jaro-winkler' | 'dice' | 'composite' = 'composite'
): { string: string; similarity: number; index: number } | null {
  if (candidates.length === 0) return null;

  let bestMatch = { string: candidates[0], similarity: 0, index: 0 };

  const similarityFn = {
    levenshtein: levenshteinSimilarity,
    'jaro-winkler': jaroWinklerSimilarity,
    dice: diceCoefficientSimilarity,
    composite: compositeSimilarity,
  }[algorithm];

  for (let i = 0; i < candidates.length; i++) {
    const similarity = similarityFn(target, candidates[i]);

    if (similarity > bestMatch.similarity) {
      bestMatch = {
        string: candidates[i],
        similarity,
        index: i,
      };
    }
  }

  return bestMatch;
}

export function clusterSimilarStrings(
  strings: string[],
  threshold: number = 0.8,
  algorithm: 'levenshtein' | 'jaro-winkler' | 'dice' | 'composite' = 'composite'
): string[][] {
  const clusters: string[][] = [];
  const processed = new Set<number>();

  const similarityFn = {
    levenshtein: levenshteinSimilarity,
    'jaro-winkler': jaroWinklerSimilarity,
    dice: diceCoefficientSimilarity,
    composite: compositeSimilarity,
  }[algorithm];

  for (let i = 0; i < strings.length; i++) {
    if (processed.has(i)) continue;

    const cluster = [strings[i]];
    processed.add(i);

    for (let j = i + 1; j < strings.length; j++) {
      if (processed.has(j)) continue;

      const similarity = similarityFn(strings[i], strings[j]);

      if (similarity >= threshold) {
        cluster.push(strings[j]);
        processed.add(j);
      }
    }

    clusters.push(cluster);
  }

  return clusters;
}

export function normalizeForComparison(str: string): string {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') 
    .replace(/[^\w\s]/g, ' ') 
    .replace(/\s+/g, ' ') 
    .trim();
}

export function numberSimilarity(num1: number, num2: number, tolerance: number = 0.01): number {
  const diff = Math.abs(num1 - num2);
  const max = Math.max(Math.abs(num1), Math.abs(num2));

  if (max === 0) return 1.0;

  const percentDiff = diff / max;
  return Math.max(0, 1 - percentDiff / tolerance);
}

export function dateSimilarity(date1: Date, date2: Date, toleranceDays: number = 1): number {
  const diff = Math.abs(date1.getTime() - date2.getTime());
  const diffDays = diff / (1000 * 60 * 60 * 24);

  return Math.max(0, 1 - diffDays / toleranceDays);
}
