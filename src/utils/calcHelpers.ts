import { evaluate } from 'mathjs';

export const formatExpression = (expr: string): string => {
  const stripped = expr.replace(/,/g, '');
  return stripped.replace(/\b\d+(\.\d+)?\b/g, (match) => {
    const parts = match.split('.');
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return parts.join('.');
  });
};

export const evaluateMath = (expr: string, isRadians: boolean): { rawResult: string, formattedResult: string, isError: boolean } => {
  try {
    if (!expr.trim()) return { rawResult: '', formattedResult: '', isError: false };
    
    let parsedExpr = expr;
    parsedExpr = parsedExpr.replace(/,/g, '');
    parsedExpr = parsedExpr.replace(/√/g, 'sqrt');
    parsedExpr = parsedExpr.replace(/π/g, 'pi');
    parsedExpr = parsedExpr.replace(/h/g, '(6.62607015e-34)');
    parsedExpr = parsedExpr.replace(/c/g, '(299792458)');
    
    let scope: any = {};
    if (!isRadians) {
      scope = {
        sin: (x: any) => Math.sin(Number(x) * Math.PI / 180),
        cos: (x: any) => Math.cos(Number(x) * Math.PI / 180),
        tan: (x: any) => Math.tan(Number(x) * Math.PI / 180),
        asin: (x: any) => Math.asin(Number(x)) * 180 / Math.PI,
        acos: (x: any) => Math.acos(Number(x)) * 180 / Math.PI,
        atan: (x: any) => Math.atan(Number(x)) * 180 / Math.PI
      };
    }

    const rawResult = String(evaluate(parsedExpr, scope));
    
    let formattedResult = rawResult;
    const numResult = Number(rawResult);
    if (!isNaN(numResult) && rawResult !== 'Infinity' && rawResult !== '-Infinity') {
      const parts = rawResult.split('.');
      parts[0] = Number(parts[0]).toLocaleString('en-US');
      formattedResult = parts.join('.');
    }

    return { rawResult, formattedResult, isError: false };
  } catch (err) {
    return { rawResult: 'Error', formattedResult: 'Error', isError: true };
  }
};
