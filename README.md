# Sistema de Benchmarking y Optimización de Consultas - Supabase

![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)
![Next.js](https://img.shields.io/badge/Next.js-16-black)
![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-green)
![Recharts](https://img.shields.io/badge/Recharts-2.15-orange)

## 📋 Definición del Problema

### Contexto
Las aplicaciones financieras modernas procesan miles de transacciones diariamente, requiriendo consultas de base de datos eficientes para análisis en tiempo real. Los métodos de búsqueda tradicionales (`LIKE %patrón%`, filtros secuenciales) se convierten en cuellos de botella a medida que los datos escalan.

### Pregunta de Investigación
**¿Cómo podemos optimizar el rendimiento de consultas en Supabase para procesamiento de transacciones usando algoritmos avanzados, y comparar con precisión la complejidad teórica con los tiempos de ejecución reales?**

### Objetivos
1. Implementar algoritmos eficientes de búsqueda de patrones (Aho-Corasick)
2. Desarrollar sistemas inteligentes de detección de duplicados
3. Habilitar procesamiento paralelo de transacciones
4. Medir y comparar el rendimiento teórico vs real de las consultas
5. Proporcionar análisis visual para insights de optimización

## 🎯 Justificación Algorítmica

### 1. Algoritmo Aho-Corasick (Búsqueda de Patrones)
**Problema**: Buscar múltiples palabras clave en descripciones de transacciones  
**Enfoque Tradicional**: O(n × m × k) - n=longitud texto, m=longitud patrón, k=patrones  
**Nuestra Solución**: O(n + m + z) - z=coincidencias encontradas  
**Aceleración**: 10-50x más rápido para múltiples patrones

**¿Por qué Aho-Corasick?**
- Un solo paso por el texto sin importar la cantidad de patrones
- Estructura trie permite compartir prefijos
- Función de fallo previene retroceso
- Ideal para filtrado de transacciones en tiempo real

### 2. Algoritmos de Similitud de Cadenas (Detección de Duplicados)
**Problema**: Identificar transacciones duplicadas/similares con errores tipográficos o variaciones

**Algoritmos Implementados**:
- **Distancia Levenshtein**: Operaciones de edición
  - Complejidad: O(n × m) con optimización de espacio a O(min(n,m))
  - Mejor para: Comparación general de texto

- **Jaro-Winkler**: Optimizado para cadenas cortas
  - Complejidad: O(n + m)
  - Mejor para: Nombres, direcciones

- **Coeficiente Dice**: Similitud basada en bigramas
  - Complejidad: O(n + m)
  - Mejor para: Textos largos

**¿Por qué Múltiples Algoritmos?**
- Diferentes fortalezas para diferentes escenarios
- Puntuación compuesta (40% texto, 30% monto, 20% fecha, 10% categoría)
- Mayor precisión mediante enfoque de conjunto

### 3. Optimización de Detección de Duplicados
**Enfoque Ingenuo**: O(n²) - comparar cada par  
**Solución Optimizada**: O(n log n) usando bloqueo/indexación  
**Aceleración**: Maneja 100k transacciones en segundos vs minutos

### 4. Procesamiento Paralelo
**Problema**: El procesamiento secuencial bloquea la UI  
**Solución**: Promise.all con división en chunks  
**Aceleración**: 2-4x dependiendo de los núcleos del CPU

### 5. Optimización de Consultas de Base de Datos
**Tradicional**: LIKE %patrón% - O(n × m)  
**Optimizado**: Búsqueda de Texto Completo (GIN) - O(log n + k)  
**Resultado**: 20-100x más rápido

## 🏗️ Arquitectura

### Vista General del Sistema
```
Frontend (Next.js) → Algorithm Layer → Benchmark Service → Supabase PostgreSQL
    ├─ Benchmarks Page      ├─ Aho-Corasick           ├─ Performance API    ├─ B-tree Indexes
    ├─ Dashboard            ├─ Similarity             ├─ Variance Analysis  ├─ GIN FTS Indexes
    └─ Database Viewer      ├─ Duplicate Detector     └─ Report Generator   ├─ Materialized Views
                            ├─ Parallel Processing                          └─ RPC Functions
                            └─ Theoretical Complexity
```

### Arquitectura de Componentes

#### 1. Algoritmos Principales (`lib/`)
- **aho-corasick.ts**: Búsqueda multi-patrón O(n+m+z)
- **similarity.ts**: 7 algoritmos de similitud
- **duplicate-detector.ts**: Detección inteligente de duplicados
- **parallel-processing.ts**: Ejecución concurrente
- **theoretical-complexity.ts**: Calculadoras Big-O

#### 2. Capa de Servicios (`services/`)
- **benchmark.ts**: Orquestación de benchmarks
- **optimizedQueries.ts**: Consultas optimizadas de Supabase

#### 3. Capa de Presentación (`app/`)
- **benchmarks/page.tsx**: UI interactiva con Recharts
- 3 tipos de gráficas: Barras, Área, Pastel

#### 4. Capa de Base de Datos (`scripts/`)
- **database-optimization.sql**: Índices + Vistas + RPC

## 📁 Estructura del Proyecto

```
mid-term-2/
├── lib/
│   ├── aho-corasick.ts
│   ├── similarity.ts
│   ├── duplicate-detector.ts
│   ├── parallel-processing.ts
│   └── theoretical-complexity.ts
├── services/
│   ├── benchmark.ts
│   ├── optimizedQueries.ts
│   └── supabase.ts
├── app/
│   ├── benchmarks/page.tsx
│   ├── dashboard/page.tsx
│   └── database/page.tsx
├── scripts/
│   └── database-optimization.sql
└── examples/
    └── benchmark-examples.ts
```

## 🚀 Instalación y Configuración

### Prerequisitos
- Node.js 18+
- Cuenta de Supabase

### Pasos
```bash
cd mid-term-2
npm install

echo "NEXT_PUBLIC_SUPABASE_URL=your_url" > .env.local
echo "NEXT_PUBLIC_SUPABASE_ANON_KEY=your_key" >> .env.local

npm run dev
```

Navegar a: `http://localhost:3000/benchmarks`

## 📊 Resultados de Rendimiento

| Operación | Big-O | Teórico | Real | Aceleración |
|-----------|-------|-------------|------|---------|
| LIKE %patrón% | O(n×m) | ~50ms | ~45ms | - |
| Búsqueda Indexada | O(log n) | ~5ms | ~8ms | 5.6x |
| Búsqueda Texto Completo | O(log n+k) | ~8ms | ~6ms | 7.5x |
| Aho-Corasick | O(n+m+z) | - | - | 10-50x |
| Procesamiento Paralelo | - | - | - | 2-4x |

## 💻 Ejemplos de Uso

### Búsqueda de Patrones
```typescript
import { AhoCorasick } from '@/lib/aho-corasick';

const ac = new AhoCorasick();
ac.addPatterns(['netflix', 'spotify', 'uber']);
ac.build();
const matches = ac.search('Pago de Netflix mensual');
```

### Detección de Duplicados
```typescript
import { DuplicateDetector } from '@/lib/duplicate-detector';

const detector = new DuplicateDetector({
  textSimilarityThreshold: 0.85
});
const duplicates = detector.detectDuplicates(transactions);
```

### Procesamiento Paralelo
```typescript
import { ParallelProcessor } from '@/lib/parallel-processing';

const processor = new ParallelProcessor(4);
const results = await processor.process(transactions, analyzeFn);
```

## 📈 Visualización

- Gráfica de Barras: Comparación Teórico vs Real
- Gráfica de Área: Análisis de varianza
- Gráfica de Pastel: Distribución de tiempos
- Tablas: Métricas detalladas

## 🎯 Entregables

- ✅ Módulo Aho-Corasick
- ✅ Módulo de Similitud (7 algoritmos)
- ✅ Detección de Duplicados
- ✅ Procesamiento Paralelo
- ✅ Módulo de Benchmarking
- ✅ Comparación Teórica
- ✅ Gráficas y Tablas (Recharts)
- ✅ Ejemplos con Transacciones Reales

## 🔧 Tecnologías

- Next.js 16, React 19, TypeScript 5
- Tailwind CSS, shadcn/ui, Recharts
- Supabase (PostgreSQL)
- Implementaciones algorítmicas personalizadas
