export interface TableDefinition {
  readonly name: string;
}

export interface ModelClass<T> {
  tableDef(): TableDefinition;
  template(): T;
}
