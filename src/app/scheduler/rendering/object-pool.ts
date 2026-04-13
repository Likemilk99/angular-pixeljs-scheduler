export class ObjectPool<T> {
  private readonly free: T[] = [];

  constructor(private readonly factory: () => T) {}

  acquire(): T {
    return this.free.pop() ?? this.factory();
  }

  release(item: T): void {
    this.free.push(item);
  }

  get size(): number {
    return this.free.length;
  }
}
