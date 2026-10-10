import { describe, expect, it } from 'vitest';
import { andAll, sqlConditions, where } from './sqlFilters';

describe('sqlFilters', () => {
  it('tanpa filter = tanpa WHERE', () => {
    expect(sqlConditions({})).toEqual([]);
    expect(where([]).sql).toBe('');
    expect(andAll([]).sql).toBe('');
  });

  it('semua nilai menjadi parameter terikat', () => {
    const sql = where(sqlConditions({
      year: 2004, month: 11, country: 'USA', productLine: ['Ships', 'Trains'], status: 'On Hold',
    }));
    expect(sql.sql).toBe(
      'WHERE YEAR(o.orderDate) = ? AND MONTH(o.orderDate) = ? AND TRIM(c.country) = ?'
      + ' AND p.productLine IN (?,?) AND o.status = ?',
    );
    expect(sql.values).toEqual([2004, 11, 'USA', 'Ships', 'Trains', 'On Hold']);
  });

  it('benua menjadi daftar negaranya', () => {
    const sql = where(sqlConditions({ continent: 'North America' }));
    expect(sql.sql).toBe('WHERE TRIM(c.country) IN (?,?)');
    expect(sql.values).toEqual(['Canada', 'USA']);
  });

  it('nilai berbahaya tetap parameter, bukan SQL', () => {
    const sql = where(sqlConditions({ productLine: ["x' OR 1=1 --"] }));
    expect(sql.sql).not.toContain('OR 1=1');
    expect(sql.values).toEqual(["x' OR 1=1 --"]);
  });

  it('andAll menempel setelah WHERE yang ada', () => {
    expect(andAll(sqlConditions({ year: 2003 })).sql).toBe('AND YEAR(o.orderDate) = ?');
  });
});
