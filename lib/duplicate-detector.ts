import {
  levenshteinSimilarity,
  jaroWinklerSimilarity,
  diceCoefficientSimilarity,
  compositeSimilarity,
  normalizeForComparison,
  numberSimilarity,
  dateSimilarity,
} from './similarity';

export interface Transaction {
  id: number;
  descripcion?: string;
  concepto?: string;
  monto: number;
  fecha: string;
  categoria?: string;
  tipo: 'ingreso' | 'gasto';
}

export interface DuplicateMatch {
  transaction1: Transaction;
  transaction2: Transaction;
  similarity: number;
  reasons: string[];
  confidence: 'high' | 'medium' | 'low';
}

export interface DuplicateDetectionConfig {

  textSimilarityThreshold: number;
  amountTolerancePercent: number;
  dateDifferenceMaxDays: number;

  weights: {
    text: number;
    amount: number;
    date: number;
    category: number;
  };

  textAlgorithm: 'levenshtein' | 'jaro-winkler' | 'dice' | 'composite';

  requireSameType: boolean; 
  requireSameCategory: boolean; 
}

export class DuplicateDetector {
  private config: DuplicateDetectionConfig;

  constructor(config?: Partial<DuplicateDetectionConfig>) {
    this.config = {
      textSimilarityThreshold: 0.85,
      amountTolerancePercent: 0.02, 
      dateDifferenceMaxDays: 3,
      weights: {
        text: 0.4,
        amount: 0.3,
        date: 0.2,
        category: 0.1,
      },
      textAlgorithm: 'composite',
      requireSameType: true,
      requireSameCategory: false,
      ...config,
    };
  }

  detectDuplicates(transactions: Transaction[]): DuplicateMatch[] {
    const duplicates: DuplicateMatch[] = [];
    const processed = new Set<string>();

    for (let i = 0; i < transactions.length; i++) {
      for (let j = i + 1; j < transactions.length; j++) {
        const tx1 = transactions[i];
        const tx2 = transactions[j];

        const pairKey = `${Math.min(tx1.id, tx2.id)}-${Math.max(tx1.id, tx2.id)}`;
        if (processed.has(pairKey)) continue;

        const match = this.compareTransactions(tx1, tx2);

        if (match) {
          duplicates.push(match);
          processed.add(pairKey);
        }
      }
    }

    return duplicates.sort((a, b) => b.similarity - a.similarity);
  }

  protected compareTransactions(
    tx1: Transaction,
    tx2: Transaction
  ): DuplicateMatch | null {

    if (this.config.requireSameType && tx1.tipo !== tx2.tipo) {
      return null;
    }

    if (
      this.config.requireSameCategory &&
      tx1.categoria !== tx2.categoria
    ) {
      return null;
    }

    const textSim = this.calculateTextSimilarity(tx1, tx2);
    const amountSim = this.calculateAmountSimilarity(tx1, tx2);
    const dateSim = this.calculateDateSimilarity(tx1, tx2);
    const categorySim = this.calculateCategorySimilarity(tx1, tx2);

    const overallSimilarity =
      textSim * this.config.weights.text +
      amountSim * this.config.weights.amount +
      dateSim * this.config.weights.date +
      categorySim * this.config.weights.category;

    if (overallSimilarity < this.config.textSimilarityThreshold) {
      return null;
    }

    const reasons: string[] = [];
    if (textSim > 0.9) reasons.push('Texto muy similar');
    if (amountSim > 0.95) reasons.push('Monto casi idéntico');
    if (dateSim > 0.9) reasons.push('Fechas muy cercanas');
    if (categorySim === 1.0) reasons.push('Misma categoría');
    if (tx1.tipo === tx2.tipo) reasons.push('Mismo tipo');

    let confidence: 'high' | 'medium' | 'low' = 'low';
    if (overallSimilarity > 0.95) confidence = 'high';
    else if (overallSimilarity > 0.90) confidence = 'medium';

    return {
      transaction1: tx1,
      transaction2: tx2,
      similarity: overallSimilarity,
      reasons,
      confidence,
    };
  }

  private calculateTextSimilarity(tx1: Transaction, tx2: Transaction): number {
    const text1 = normalizeForComparison(tx1.descripcion || tx1.concepto || '');
    const text2 = normalizeForComparison(tx2.descripcion || tx2.concepto || '');

    if (text1.length === 0 && text2.length === 0) return 1.0;
    if (text1.length === 0 || text2.length === 0) return 0.0;

    const similarityFn = {
      levenshtein: levenshteinSimilarity,
      'jaro-winkler': jaroWinklerSimilarity,
      dice: diceCoefficientSimilarity,
      composite: compositeSimilarity,
    }[this.config.textAlgorithm];

    return similarityFn(text1, text2);
  }

  private calculateAmountSimilarity(tx1: Transaction, tx2: Transaction): number {
    return numberSimilarity(
      tx1.monto,
      tx2.monto,
      this.config.amountTolerancePercent
    );
  }

  private calculateDateSimilarity(tx1: Transaction, tx2: Transaction): number {
    const date1 = new Date(tx1.fecha);
    const date2 = new Date(tx2.fecha);

    return dateSimilarity(date1, date2, this.config.dateDifferenceMaxDays);
  }

  private calculateCategorySimilarity(tx1: Transaction, tx2: Transaction): number {
    if (!tx1.categoria && !tx2.categoria) return 1.0;
    if (!tx1.categoria || !tx2.categoria) return 0.0;

    return tx1.categoria === tx2.categoria ? 1.0 : 0.0;
  }

  findDuplicatesOf(
    transaction: Transaction,
    candidates: Transaction[]
  ): DuplicateMatch[] {
    const matches: DuplicateMatch[] = [];

    for (const candidate of candidates) {
      if (candidate.id === transaction.id) continue;

      const match = this.compareTransactions(transaction, candidate);
      if (match) {
        matches.push(match);
      }
    }

    return matches.sort((a, b) => b.similarity - a.similarity);
  }

  groupDuplicates(transactions: Transaction[]): Transaction[][] {
    const groups: Transaction[][] = [];
    const assigned = new Set<number>();

    for (let i = 0; i < transactions.length; i++) {
      if (assigned.has(transactions[i].id)) continue;

      const group = [transactions[i]];
      assigned.add(transactions[i].id);

      const duplicates = this.findDuplicatesOf(
        transactions[i],
        transactions.slice(i + 1)
      );

      for (const dup of duplicates) {
        if (!assigned.has(dup.transaction2.id)) {
          group.push(dup.transaction2);
          assigned.add(dup.transaction2.id);
        }
      }

      groups.push(group);
    }

    return groups;
  }

  getStats(duplicates: DuplicateMatch[]): {
    total: number;
    highConfidence: number;
    mediumConfidence: number;
    lowConfidence: number;
    averageSimilarity: number;
    byReason: Record<string, number>;
  } {
    const stats = {
      total: duplicates.length,
      highConfidence: duplicates.filter(d => d.confidence === 'high').length,
      mediumConfidence: duplicates.filter(d => d.confidence === 'medium').length,
      lowConfidence: duplicates.filter(d => d.confidence === 'low').length,
      averageSimilarity:
        duplicates.reduce((sum, d) => sum + d.similarity, 0) / duplicates.length || 0,
      byReason: {} as Record<string, number>,
    };

    duplicates.forEach(dup => {
      dup.reasons.forEach(reason => {
        stats.byReason[reason] = (stats.byReason[reason] || 0) + 1;
      });
    });

    return stats;
  }
}

export class OptimizedDuplicateDetector extends DuplicateDetector {

  detectDuplicatesOptimized(transactions: Transaction[]): DuplicateMatch[] {

    const blocks = this.createBlocks(transactions);
    const duplicates: DuplicateMatch[] = [];
    const processed = new Set<string>();

    for (const block of blocks.values()) {
      if (block.length < 2) continue;

      for (let i = 0; i < block.length; i++) {
        for (let j = i + 1; j < block.length; j++) {
          const tx1 = block[i];
          const tx2 = block[j];

          const pairKey = `${Math.min(tx1.id, tx2.id)}-${Math.max(tx1.id, tx2.id)}`;
          if (processed.has(pairKey)) continue;

          const match = this.compareTransactions(tx1, tx2);

          if (match) {
            duplicates.push(match);
            processed.add(pairKey);
          }
        }
      }
    }

    return duplicates.sort((a, b) => b.similarity - a.similarity);
  }

  private createBlocks(transactions: Transaction[]): Map<string, Transaction[]> {
    const blocks = new Map<string, Transaction[]>();

    for (const tx of transactions) {

      const date = new Date(tx.fecha);
      const weekNumber = this.getWeekNumber(date);
      const amountBucket = Math.floor(tx.monto / 100) * 100; 

      const blockKey = `${tx.tipo}_${weekNumber}_${amountBucket}`;

      if (!blocks.has(blockKey)) {
        blocks.set(blockKey, []);
      }

      blocks.get(blockKey)!.push(tx);

      const neighborKeys = [
        `${tx.tipo}_${weekNumber - 1}_${amountBucket}`,
        `${tx.tipo}_${weekNumber + 1}_${amountBucket}`,
        `${tx.tipo}_${weekNumber}_${amountBucket - 100}`,
        `${tx.tipo}_${weekNumber}_${amountBucket + 100}`,
      ];

      neighborKeys.forEach(key => {
        if (!blocks.has(key)) {
          blocks.set(key, []);
        }
        blocks.get(key)!.push(tx);
      });
    }

    return blocks;
  }

  private getWeekNumber(date: Date): number {
    const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
    const pastDaysOfYear = (date.getTime() - firstDayOfYear.getTime()) / 86400000;
    return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
  }
}

export function mergeDuplicates(
  duplicates: Transaction[],
  keepStrategy: 'first' | 'last' | 'highest' | 'lowest' = 'last'
): Transaction {
  if (duplicates.length === 0) {
    throw new Error('No transactions to merge');
  }

  if (duplicates.length === 1) {
    return duplicates[0];
  }

  let keeper = duplicates[0];

  switch (keepStrategy) {
    case 'first':
      keeper = duplicates[0];
      break;
    case 'last':
      keeper = duplicates[duplicates.length - 1];
      break;
    case 'highest':
      keeper = duplicates.reduce((max, tx) => (tx.monto > max.monto ? tx : max));
      break;
    case 'lowest':
      keeper = duplicates.reduce((min, tx) => (tx.monto < min.monto ? tx : min));
      break;
  }

  return keeper;
}

export function markAsDuplicates(matches: DuplicateMatch[]): {
  primary: number[];
  duplicates: number[];
} {
  const primary: number[] = [];
  const duplicates: number[] = [];
  const processed = new Set<number>();

  for (const match of matches) {
    const id1 = match.transaction1.id;
    const id2 = match.transaction2.id;

    if (!processed.has(id1)) {
      primary.push(id1);
      processed.add(id1);
    }

    if (!processed.has(id2)) {
      duplicates.push(id2);
      processed.add(id2);
    }
  }

  return { primary, duplicates };
}
