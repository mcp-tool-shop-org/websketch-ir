import { describe, it, expect } from 'vitest';
import {
  renderAscii,
  fingerprintCapture,
  diff,
  hashNodeShallow,
  normalizeText,
  MAX_DEPTH,
  type WebSketchCapture,
  type UINode,
} from '../src/index.js';

describe('websketch-ir public API loads', () => {
  it('exports render functions', () => {
    expect(typeof renderAscii).toBe('function');
  });

  it('exports hash functions', () => {
    expect(typeof fingerprintCapture).toBe('function');
    expect(typeof hashNodeShallow).toBe('function');
  });

  it('exports diff functions', () => {
    expect(typeof diff).toBe('function');
  });

  it('exports text utilities', () => {
    expect(typeof normalizeText).toBe('function');
  });

  it('exports grammar constants', () => {
    expect(MAX_DEPTH).toBeGreaterThan(0);
  });

  it('normalizeText trims and lowercases', () => {
    expect(normalizeText('  Hello World  ')).toBe('hello world');
  });
});
