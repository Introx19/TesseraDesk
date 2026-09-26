import { describe, it, expect } from 'vitest';
import { formatExpression, evaluateMath } from '../src/utils/calcHelpers';

describe('calcHelpers', () => {
  describe('formatExpression', () => {
    it('should format numbers with commas', () => {
      expect(formatExpression('1000')).toBe('1,000');
      expect(formatExpression('1000000')).toBe('1,000,000');
      expect(formatExpression('1000.55')).toBe('1,000.55');
    });

    it('should not add commas to decimal parts', () => {
      expect(formatExpression('1000.12345')).toBe('1,000.12345');
    });

    it('should format complex expressions', () => {
      expect(formatExpression('1000+2000')).toBe('1,000+2,000');
      expect(formatExpression('1000*2')).toBe('1,000*2');
      expect(formatExpression('(1000+500)/2')).toBe('(1,000+500)/2');
    });
    
    it('should strip existing commas before re-formatting', () => {
      expect(formatExpression('1,000,000+1000')).toBe('1,000,000+1,000');
    });
  });

  describe('evaluateMath', () => {
    it('should calculate simple math correctly', () => {
      const res1 = evaluateMath('2+2', true);
      expect(res1.rawResult).toBe('4');
      expect(res1.formattedResult).toBe('4');
      expect(res1.isError).toBe(false);

      const res2 = evaluateMath('1000*2', true);
      expect(res2.rawResult).toBe('2000');
      expect(res2.formattedResult).toBe('2,000');
    });

    it('should strip commas before evaluating', () => {
      const res = evaluateMath('1,000+2,000', true);
      expect(res.rawResult).toBe('3000');
      expect(res.formattedResult).toBe('3,000');
    });

    it('should handle special constants (pi, c, h, sqrt)', () => {
      const resPi = evaluateMath('π', true);
      expect(Number(resPi.rawResult)).toBeCloseTo(Math.PI, 5);

      const resSqrt = evaluateMath('√(9)', true);
      expect(resSqrt.rawResult).toBe('3');
    });

    it('should handle trigonometry in radians', () => {
      const res = evaluateMath('sin(pi/2)', true);
      expect(Number(res.rawResult)).toBeCloseTo(1, 5);
    });

    it('should handle trigonometry in degrees', () => {
      const res = evaluateMath('sin(90)', false);
      expect(Number(res.rawResult)).toBeCloseTo(1, 5);
    });

    it('should return error for invalid expressions', () => {
      const res = evaluateMath('2+/2', true);
      expect(res.isError).toBe(true);
      expect(res.rawResult).toBe('Error');
    });

    it('should handle empty or whitespace expressions', () => {
      const res = evaluateMath('   ', true);
      expect(res.isError).toBe(false);
      expect(res.rawResult).toBe('');
    });
  });
});
