interface TrieNode {
  children: Map<string, TrieNode>;
  fail: TrieNode | null;
  output: string[];
  depth: number;
}

export class AhoCorasick {
  private root: TrieNode;
  private patterns: string[];
  private built: boolean;

  constructor() {
    this.root = this.createNode();
    this.patterns = [];
    this.built = false;
  }

  private createNode(): TrieNode {
    return {
      children: new Map(),
      fail: null,
      output: [],
      depth: 0,
    };
  }

  addPattern(pattern: string): void {
    if (!pattern || pattern.length === 0) return;

    const normalizedPattern = pattern.toLowerCase().trim();
    if (normalizedPattern.length === 0) return;

    this.patterns.push(normalizedPattern);
    this.built = false;

    let currentNode = this.root;

    for (let i = 0; i < normalizedPattern.length; i++) {
      const char = normalizedPattern[i];

      if (!currentNode.children.has(char)) {
        const newNode = this.createNode();
        newNode.depth = currentNode.depth + 1;
        currentNode.children.set(char, newNode);
      }

      currentNode = currentNode.children.get(char)!;
    }

    currentNode.output.push(normalizedPattern);
  }

  addPatterns(patterns: string[]): void {
    patterns.forEach(pattern => this.addPattern(pattern));
  }

  build(): void {
    if (this.built) return;

    const queue: TrieNode[] = [];

    for (const child of this.root.children.values()) {
      child.fail = this.root;
      queue.push(child);
    }

    while (queue.length > 0) {
      const currentNode = queue.shift()!;

      for (const [char, childNode] of currentNode.children) {
        queue.push(childNode);

        let failNode = currentNode.fail;

        while (failNode !== null && !failNode.children.has(char)) {
          failNode = failNode.fail;
        }

        if (failNode === null) {
          childNode.fail = this.root;
        } else {
          childNode.fail = failNode.children.get(char)!;

          childNode.output = [
            ...childNode.output,
            ...childNode.fail.output,
          ];
        }
      }
    }

    this.built = true;
  }

  search(text: string): Array<{ pattern: string; position: number; endPosition: number }> {
    if (!this.built) {
      this.build();
    }

    const normalizedText = text.toLowerCase();
    const results: Array<{ pattern: string; position: number; endPosition: number }> = [];

    let currentNode = this.root;

    for (let i = 0; i < normalizedText.length; i++) {
      const char = normalizedText[i];

      while (currentNode !== this.root && !currentNode.children.has(char)) {
        currentNode = currentNode.fail!;
      }

      if (currentNode.children.has(char)) {
        currentNode = currentNode.children.get(char)!;
      }

      for (const pattern of currentNode.output) {
        results.push({
          pattern,
          position: i - pattern.length + 1,
          endPosition: i + 1,
        });
      }
    }

    return results;
  }

  contains(text: string): boolean {
    if (!this.built) {
      this.build();
    }

    const normalizedText = text.toLowerCase();
    let currentNode = this.root;

    for (let i = 0; i < normalizedText.length; i++) {
      const char = normalizedText[i];

      while (currentNode !== this.root && !currentNode.children.has(char)) {
        currentNode = currentNode.fail!;
      }

      if (currentNode.children.has(char)) {
        currentNode = currentNode.children.get(char)!;
      }

      if (currentNode.output.length > 0) {
        return true;
      }
    }

    return false;
  }

  count(text: string): number {
    return this.search(text).length;
  }

  getMatchedPatterns(text: string): string[] {
    const matches = this.search(text);
    const uniquePatterns = new Set(matches.map(m => m.pattern));
    return Array.from(uniquePatterns);
  }

  replace(text: string, replacement: string | ((match: string) => string)): string {
    const matches = this.search(text).sort((a, b) => b.position - a.position);
    let result = text;

    for (const match of matches) {
      const replaceWith = typeof replacement === 'function'
        ? replacement(match.pattern)
        : replacement;

      result =
        result.substring(0, match.position) +
        replaceWith +
        result.substring(match.endPosition);
    }

    return result;
  }

  highlight(text: string, highlightFn: (text: string, pattern: string) => string): string {
    const matches = this.search(text).sort((a, b) => b.position - a.position);
    let result = text;

    for (const match of matches) {
      const matchedText = text.substring(match.position, match.endPosition);
      const highlighted = highlightFn(matchedText, match.pattern);

      result =
        result.substring(0, match.position) +
        highlighted +
        result.substring(match.endPosition);
    }

    return result;
  }

  getStats(): {
    patternCount: number;
    nodeCount: number;
    maxDepth: number;
    avgPatternLength: number;
  } {
    let nodeCount = 0;
    let maxDepth = 0;

    const countNodes = (node: TrieNode) => {
      nodeCount++;
      maxDepth = Math.max(maxDepth, node.depth);

      for (const child of node.children.values()) {
        countNodes(child);
      }
    };

    countNodes(this.root);

    const avgPatternLength = this.patterns.length > 0
      ? this.patterns.reduce((sum, p) => sum + p.length, 0) / this.patterns.length
      : 0;

    return {
      patternCount: this.patterns.length,
      nodeCount,
      maxDepth,
      avgPatternLength,
    };
  }

  clear(): void {
    this.root = this.createNode();
    this.patterns = [];
    this.built = false;
  }
}

export function createTransactionPatternMatcher(): AhoCorasick {
  const ac = new AhoCorasick();

  const commonPatterns = [
    'netflix', 'spotify', 'uber', 'rappi', 'didi',
    'amazon', 'mercadolibre', 'walmart', 'soriana',

    'supermercado', 'restaurant', 'gasolina', 'transporte',
    'educacion', 'salud', 'entretenimiento', 'renta',
    'luz', 'agua', 'gas', 'internet', 'telefono',

    'tarjeta', 'efectivo', 'transferencia', 'cheque',

    'pago', 'compra', 'servicio', 'suscripcion',
    'factura', 'recibo', 'cargo', 'abono',
  ];

  ac.addPatterns(commonPatterns);
  ac.build();

  return ac;
}

export function searchTransactions(
  transactions: Array<{ descripcion?: string; concepto?: string }>,
  patterns: string[]
): Array<{ index: number; matches: string[] }> {
  const ac = new AhoCorasick();
  ac.addPatterns(patterns);
  ac.build();

  const results: Array<{ index: number; matches: string[] }> = [];

  transactions.forEach((tx, index) => {
    const text = (tx.descripcion || tx.concepto || '').toLowerCase();
    const matches = ac.getMatchedPatterns(text);

    if (matches.length > 0) {
      results.push({ index, matches });
    }
  });

  return results;
}

export function compareSearchPerformance(
  text: string,
  patterns: string[]
): {
  ahoCorasick: { time: number; matches: number };
  simple: { time: number; matches: number };
  speedup: number;
} {
  const acStart = performance.now();
  const ac = new AhoCorasick();
  ac.addPatterns(patterns);
  ac.build();
  const acMatches = ac.search(text);
  const acTime = performance.now() - acStart;

  const simpleStart = performance.now();
  let simpleMatches = 0;
  const lowerText = text.toLowerCase();
  patterns.forEach(pattern => {
    const lowerPattern = pattern.toLowerCase();
    let pos = lowerText.indexOf(lowerPattern);
    while (pos !== -1) {
      simpleMatches++;
      pos = lowerText.indexOf(lowerPattern, pos + 1);
    }
  });
  const simpleTime = performance.now() - simpleStart;

  return {
    ahoCorasick: { time: acTime, matches: acMatches.length },
    simple: { time: simpleTime, matches: simpleMatches },
    speedup: simpleTime / acTime,
  };
}
