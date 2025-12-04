import { Transaction, DuplicateDetector, DuplicateMatch } from './duplicate-detector';
import { AhoCorasick } from './aho-corasick';

export function chunkArray<T>(array: T[], chunkSize: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += chunkSize) {
    chunks.push(array.slice(i, i + chunkSize));
  }
  return chunks;
}

export async function processTransactionsParallel<T, R>(
  transactions: T[],
  processFn: (transaction: T) => Promise<R>,
  concurrency: number = 4
): Promise<R[]> {
  const chunks = chunkArray(transactions, Math.ceil(transactions.length / concurrency));

  const results = await Promise.all(
    chunks.map(chunk =>
      Promise.all(chunk.map(tx => processFn(tx)))
    )
  );

  return results.flat();
}

export async function detectDuplicatesParallel(
  transactions: Transaction[],
  chunkSize: number = 100
): Promise<DuplicateMatch[]> {
  const chunks = chunkArray(transactions, chunkSize);
  const detector = new DuplicateDetector();

  const chunkResults = await Promise.all(
    chunks.map(async (chunk, index) => {
      console.log(`Processing chunk ${index + 1}/${chunks.length}...`);

      const intraChunkDuplicates = detector.detectDuplicates(chunk);

      const interChunkDuplicates: DuplicateMatch[] = [];
      for (let i = 0; i < index; i++) {
        const previousChunk = chunks[i];
        for (const tx of chunk) {
          const matches = detector.findDuplicatesOf(tx, previousChunk);
          interChunkDuplicates.push(...matches);
        }
      }

      return [...intraChunkDuplicates, ...interChunkDuplicates];
    })
  );

  const allDuplicates = chunkResults.flat();
  const uniqueDuplicates = deduplicateMatches(allDuplicates);

  return uniqueDuplicates;
}

function deduplicateMatches(matches: DuplicateMatch[]): DuplicateMatch[] {
  const seen = new Set<string>();
  const unique: DuplicateMatch[] = [];

  for (const match of matches) {
    const key = `${Math.min(match.transaction1.id, match.transaction2.id)}-${Math.max(match.transaction1.id, match.transaction2.id)}`;

    if (!seen.has(key)) {
      seen.add(key);
      unique.push(match);
    }
  }

  return unique;
}

export async function searchTransactionsParallel(
  transactions: Array<{ descripcion?: string; concepto?: string }>,
  patterns: string[],
  chunkSize: number = 500
): Promise<Array<{ index: number; matches: string[] }>> {
  const chunks = chunkArray(transactions, chunkSize);
  const ac = new AhoCorasick();
  ac.addPatterns(patterns);
  ac.build();

  const results = await Promise.all(
    chunks.map(async (chunk, chunkIndex) => {
      const chunkResults: Array<{ index: number; matches: string[] }> = [];
      const startIndex = chunkIndex * chunkSize;

      chunk.forEach((tx, localIndex) => {
        const text = (tx.descripcion || tx.concepto || '').toLowerCase();
        const matches = ac.getMatchedPatterns(text);

        if (matches.length > 0) {
          chunkResults.push({
            index: startIndex + localIndex,
            matches,
          });
        }
      });

      return chunkResults;
    })
  );

  return results.flat();
}

export class ParallelProcessor<T, R> {
  private maxConcurrency: number;
  private running: number = 0;
  private queue: Array<() => Promise<void>> = [];

  constructor(maxConcurrency: number = 4) {
    this.maxConcurrency = maxConcurrency;
  }

  async process(
    items: T[],
    processFn: (item: T, index: number) => Promise<R>,
    onProgress?: (completed: number, total: number) => void
  ): Promise<R[]> {
    const results: R[] = new Array(items.length);
    let completed = 0;

    const processItem = async (item: T, index: number) => {
      this.running++;

      try {
        results[index] = await processFn(item, index);
        completed++;

        if (onProgress) {
          onProgress(completed, items.length);
        }
      } finally {
        this.running--;
        this.processQueue();
      }
    };

    return new Promise((resolve, reject) => {
      items.forEach((item, index) => {
        const task = () => processItem(item, index);

        if (this.running < this.maxConcurrency) {
          task().catch(reject);
        } else {
          this.queue.push(task);
        }
      });

      const checkComplete = setInterval(() => {
        if (completed === items.length) {
          clearInterval(checkComplete);
          resolve(results);
        }
      }, 100);
    });
  }

  private processQueue() {
    while (this.running < this.maxConcurrency && this.queue.length > 0) {
      const task = this.queue.shift()!;
      task();
    }
  }
}

export async function benchmarkParallelProcessing(
  transactions: Transaction[],
  chunkSize: number = 100
): Promise<{
  sequential: { time: number; duplicates: number };
  parallel: { time: number; duplicates: number };
  speedup: number;
}> {
  const detector = new DuplicateDetector();

  console.log('Testing sequential processing...');
  const seqStart = performance.now();
  const seqDuplicates = detector.detectDuplicates(transactions);
  const seqTime = performance.now() - seqStart;

  console.log('Testing parallel processing...');
  const parStart = performance.now();
  const parDuplicates = await detectDuplicatesParallel(transactions, chunkSize);
  const parTime = performance.now() - parStart;

  return {
    sequential: { time: seqTime, duplicates: seqDuplicates.length },
    parallel: { time: parTime, duplicates: parDuplicates.length },
    speedup: seqTime / parTime,
  };
}

export async function processBatches<T, R>(
  items: T[],
  batchSize: number,
  processBatch: (batch: T[], batchIndex: number) => Promise<R[]>,
  onBatchComplete?: (batchIndex: number, total: number) => void
): Promise<R[]> {
  const batches = chunkArray(items, batchSize);
  const results: R[] = [];

  for (let i = 0; i < batches.length; i++) {
    const batchResults = await processBatch(batches[i], i);
    results.push(...batchResults);

    if (onBatchComplete) {
      onBatchComplete(i + 1, batches.length);
    }

    await new Promise(resolve => setTimeout(resolve, 10));
  }

  return results;
}

export async function mapReduce<T, M, R>(
  items: T[],
  mapFn: (item: T) => M,
  reduceFn: (acc: R, mapped: M) => R,
  initialValue: R,
  chunkSize: number = 100
): Promise<R> {
  const chunks = chunkArray(items, chunkSize);

  const mappedChunks = await Promise.all(
    chunks.map(async chunk => chunk.map(mapFn))
  );

  const mapped = mappedChunks.flat();
  return mapped.reduce(reduceFn, initialValue);
}
