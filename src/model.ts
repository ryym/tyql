export interface ModelConfig<T> {
  readonly table: string;
  template(): T;
}

export interface ModelClass<T> {
  tyql: ModelConfig<T>;
}

type MethodNames<T> = {
  [P in keyof T]: T[P] extends (...args: any[]) => any ? P : never
}[keyof T];

export type FieldNames<T> = Exclude<keyof T, MethodNames<T>>;

export type Fields<T> = { [P in FieldNames<T>]: T[P] };
