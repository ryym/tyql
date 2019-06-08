import { Query, Selectable } from './types';

export const mapRows = (query: Query<any>, rows: any[][]): any[] => {
  const select = query.select || query.defaultSelect;
  return rows.map(row => mapRow(select, row));
};

const mapRow = (select: Selectable<any>[], rawRow: any[]): any => {
  const row: any[] = [];
  let rowIdx = 0;
  let rawRowIdx = 0;
  select.forEach(sel => {
    switch (sel.$type) {
      case 'COLUMN_LIST':
        const cols = sel.columns();
        const m = cols[0].modelClass.tyql.template();
        sel.columns().forEach(col => {
          m[col.fieldName] = rawRow[rawRowIdx++];
        });
        row[rowIdx++] = m;
        break;
      case 'ALIASED':
        // TODO
        break;
      default:
        row[rowIdx++] = rawRow[rawRowIdx++];
        break;
    }
  });
  return select.length === 1 ? row[0] : row;
};
