export interface ModelConfig<T> {
  readonly table: string;
  template(): T;
}

export interface ModelClass<T> {
  tyql: ModelConfig<T>;
}

// Do nothing. Just for type inferences.
export const modelConfig = <T>(config: ModelConfig<T>): ModelConfig<T> => config;
