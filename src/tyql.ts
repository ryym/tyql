import { TableDefinition } from './types';

export const tableDef = (name: string): TableDefinition => {
  return { name };
};

export { schema, to } from './schema';
