import { Query, Selectable, ColumnList, Joinable } from './types';
import { unreachable } from './unreachable';

export const mapRows = (query: Query<any>, rows: any[][]): any[] => {
  const select = query.select || query.defaultSelect;
  return rows.map(row => mapRow(select, row));
};

const mapRow = (select: Selectable<any>[], rawRow: any[]): any => {
  const row: any[] = [];
  let rowIdx = 0;
  let rawRowIdx = 0;

  const mapColumnList = (cl: ColumnList<any>): any => {
    const cols = cl.columns();
    const m = cols[0].modelClass.tyql.template();
    cols.forEach(col => {
      m[col.toExpr().fieldName] = rawRow[rawRowIdx++];
    });
    return m;
  };

  const mapJoinable = (j: Joinable<any, any, any, any>): any => {
    const joins = j.joins();
    const root = mapColumnList(j.rightColumns());
    if (joins.length === 0) {
      return root;
    }
    const subJoins = joins.map(mapJoinable);
    return [root, ...subJoins];
  };

  select.forEach(sel => {
    switch (sel.$type) {
      case 'COLUMN_LIST':
        row[rowIdx++] = mapColumnList(sel);
        break;
      case 'JOINABLE':
        row[rowIdx++] = mapJoinable(sel);
        break;
      case 'ALIASED':
        throw new Error('unimplemented');
      case 'EXPR':
        row[rowIdx++] = rawRow[rawRowIdx++];
        break;
      default:
        unreachable(sel);
    }
  });
  return select.length === 1 ? row[0] : row;
};
