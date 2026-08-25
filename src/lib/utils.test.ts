import { describe, expect, it } from 'vitest';

import { formatCredits, formatFileSize, formatRelativeTime } from './utils';

describe('formatCredits', () => {
  it('formats a positive integer with locale grouping', () => {
    expect(formatCredits(1234567)).toBe('1,234,567');
  });

  it('formats zero as 0', () => {
    expect(formatCredits(0)).toBe('0');
  });

  it('formats a small number without separators', () => {
    expect(formatCredits(42)).toBe('42');
  });

  it('formats a negative number with a leading minus', () => {
    expect(formatCredits(-100)).toBe('-100');
  });
});

describe('formatFileSize', () => {
  it('formats bytes below 1 KB as bytes', () => {
    expect(formatFileSize(0)).toBe('0 B');
    expect(formatFileSize(512)).toBe('512 B');
    expect(formatFileSize(1023)).toBe('1023 B');
  });

  it('formats sizes in the KB range', () => {
    expect(formatFileSize(1024)).toBe('1.0 KB');
    expect(formatFileSize(1024 * 2.5)).toBe('2.5 KB');
  });

  it('formats sizes in the MB range', () => {
    expect(formatFileSize(1024 * 1024)).toBe('1.0 MB');
    expect(formatFileSize(1024 * 1024 * 5.5)).toBe('5.5 MB');
  });

  it('formats sizes in the GB range', () => {
    expect(formatFileSize(1024 * 1024 * 1024)).toBe('1.00 GB');
    expect(formatFileSize(1024 * 1024 * 1024 * 2.5)).toBe('2.50 GB');
  });
});

describe('formatRelativeTime', () => {
  it('returns an em-dash for a zero timestamp', () => {
    expect(formatRelativeTime(0)).toBe('—');
  });

  it('returns "just now" for a timestamp less than 60 seconds ago', () => {
    const now = Date.now();
    expect(formatRelativeTime(now)).toBe('just now');
    expect(formatRelativeTime(now - 30 * 1000)).toBe('just now');
  });

  it('returns minutes ago for timestamps 60–3599 seconds ago', () => {
    const now = Date.now();
    expect(formatRelativeTime(now - 120 * 1000)).toBe('2m ago');
    expect(formatRelativeTime(now - 59 * 60 * 1000)).toBe('59m ago');
  });

  it('returns hours ago for timestamps 1–23 hours ago', () => {
    const now = Date.now();
    expect(formatRelativeTime(now - 2 * 60 * 60 * 1000)).toBe('2h ago');
    expect(formatRelativeTime(now - 23 * 60 * 60 * 1000)).toBe('23h ago');
  });

  it('returns days ago for timestamps 24+ hours ago', () => {
    const now = Date.now();
    expect(formatRelativeTime(now - 24 * 60 * 60 * 1000)).toBe('1d ago');
    expect(formatRelativeTime(now - 7 * 24 * 60 * 60 * 1000)).toBe('7d ago');
  });
});