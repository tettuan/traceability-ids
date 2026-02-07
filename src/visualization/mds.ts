/**
 * Classical Multidimensional Scaling (MDS) algorithm
 *
 * Transforms a distance matrix into coordinates in lower-dimensional space
 * while preserving pairwise distances as much as possible.
 *
 * Uses double centering and eigenvalue decomposition (Jacobi method).
 * Pure TypeScript, no external dependencies.
 *
 * @module
 */

/** Result of MDS computation */
export interface MDSResult {
  /** Coordinates array: coordinates[i] = [x, y, z, ...] for item i */
  coordinates: number[][];
  /** Eigenvalues corresponding to each dimension (descending order) */
  eigenvalues: number[];
}

/**
 * Compute Classical MDS from a distance matrix.
 *
 * @param distanceMatrix - Symmetric n×n distance matrix
 * @param dimensions - Number of output dimensions (default: 3)
 * @returns MDSResult with coordinates and eigenvalues
 */
export function classicalMDS(
  distanceMatrix: number[][],
  dimensions: number = 3,
): MDSResult {
  const n = distanceMatrix.length;
  if (n === 0) {
    return { coordinates: [], eigenvalues: [] };
  }
  if (n === 1) {
    return {
      coordinates: [new Array(dimensions).fill(0)],
      eigenvalues: new Array(dimensions).fill(0),
    };
  }

  // 1. Square the distances
  const D2: number[][] = Array.from(
    { length: n },
    (_, i) => Array.from({ length: n }, (_, j) => distanceMatrix[i][j] ** 2),
  );

  // 2. Double centering: B = -0.5 * H * D² * H, where H = I - (1/n) * 11'
  const rowMeans = new Array(n).fill(0);
  const colMeans = new Array(n).fill(0);
  let grandMean = 0;

  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      rowMeans[i] += D2[i][j];
      colMeans[j] += D2[i][j];
      grandMean += D2[i][j];
    }
  }
  for (let i = 0; i < n; i++) {
    rowMeans[i] /= n;
    colMeans[i] /= n;
  }
  grandMean /= n * n;

  const B: number[][] = Array.from({ length: n }, (_, i) =>
    Array.from(
      { length: n },
      (_, j) => -0.5 * (D2[i][j] - rowMeans[i] - colMeans[j] + grandMean),
    ));

  // 3. Eigenvalue decomposition using Jacobi iteration
  const { eigenvalues, eigenvectors } = jacobiEigen(B);

  // 4. Sort eigenvalues descending and pick top dimensions
  const indices = eigenvalues.map((_, i) => i);
  indices.sort((a, b) => eigenvalues[b] - eigenvalues[a]);

  const dim = Math.min(dimensions, n);
  const topEigenvalues = indices.slice(0, dim).map((i) => eigenvalues[i]);
  const coordinates: number[][] = Array.from({ length: n }, () => new Array(dimensions).fill(0));

  for (let d = 0; d < dim; d++) {
    const idx = indices[d];
    const ev = Math.max(topEigenvalues[d], 0); // Clamp negative eigenvalues
    const scale = Math.sqrt(ev);
    for (let i = 0; i < n; i++) {
      coordinates[i][d] = eigenvectors[i][idx] * scale;
    }
  }

  return { coordinates, eigenvalues: topEigenvalues };
}

/**
 * Jacobi eigenvalue algorithm for symmetric matrices.
 *
 * Iteratively applies Givens rotations to diagonalize the matrix.
 * Returns eigenvalues and eigenvectors.
 */
function jacobiEigen(
  matrix: number[][],
): { eigenvalues: number[]; eigenvectors: number[][] } {
  const n = matrix.length;
  const maxIterations = 100 * n * n;
  const tolerance = 1e-10;

  // Copy matrix (will be modified)
  const A: number[][] = matrix.map((row) => [...row]);

  // Initialize eigenvectors as identity matrix
  const V: number[][] = Array.from(
    { length: n },
    (_, i) => Array.from({ length: n }, (_, j) => (i === j ? 1 : 0)),
  );

  for (let iter = 0; iter < maxIterations; iter++) {
    // Find largest off-diagonal element
    let maxVal = 0;
    let p = 0;
    let q = 1;
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const absVal = Math.abs(A[i][j]);
        if (absVal > maxVal) {
          maxVal = absVal;
          p = i;
          q = j;
        }
      }
    }

    if (maxVal < tolerance) {
      break; // Converged
    }

    // Compute rotation angle
    const theta = (A[q][q] - A[p][p]) / (2 * A[p][q]);
    const t = Math.sign(theta) / (Math.abs(theta) + Math.sqrt(theta * theta + 1));
    const c = 1 / Math.sqrt(t * t + 1);
    const s = t * c;

    // Apply rotation to A
    const app = A[p][p];
    const aqq = A[q][q];
    const apq = A[p][q];

    A[p][p] = c * c * app - 2 * s * c * apq + s * s * aqq;
    A[q][q] = s * s * app + 2 * s * c * apq + c * c * aqq;
    A[p][q] = 0;
    A[q][p] = 0;

    for (let i = 0; i < n; i++) {
      if (i !== p && i !== q) {
        const aip = A[i][p];
        const aiq = A[i][q];
        A[i][p] = c * aip - s * aiq;
        A[p][i] = A[i][p];
        A[i][q] = s * aip + c * aiq;
        A[q][i] = A[i][q];
      }
    }

    // Update eigenvectors
    for (let i = 0; i < n; i++) {
      const vip = V[i][p];
      const viq = V[i][q];
      V[i][p] = c * vip - s * viq;
      V[i][q] = s * vip + c * viq;
    }
  }

  const eigenvalues = Array.from({ length: n }, (_, i) => A[i][i]);
  return { eigenvalues, eigenvectors: V };
}
