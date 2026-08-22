export type SaveAnswer<T> = (answerId: string, value: T) => Promise<void>;

export class AnswerSaveCoordinator<T> {
  private desired = new Map<string, T>();
  private persisted = new Map<string, T>();
  private running = new Map<string, Promise<void>>();
  private failures = new Map<string, unknown>();
  constructor(private readonly save: SaveAnswer<T>, private readonly onError: (id: string, error: unknown) => void) {}

  select(id: string, value: T) {
    this.desired.set(id, value);
    if (!this.running.has(id)) this.start(id);
  }

  private start(id: string) {
    const task = (async () => {
      while (this.persisted.get(id) !== this.desired.get(id)) {
        const value = this.desired.get(id)!;
        try {
          await this.save(id, value);
          this.persisted.set(id, value);
        } catch (error) {
          this.failures.set(id, error);
          this.onError(id, error);
          return;
        }
      }
    })().finally(() => this.running.delete(id));
    this.running.set(id, task);
  }

  retry(id: string) { this.failures.delete(id); if (this.desired.has(id) && !this.running.has(id)) this.start(id); }
  isPending(id?: string) { return id ? this.running.has(id) : this.running.size > 0; }
  async flush() { await Promise.all(this.running.values()); if (this.failures.size) throw [...this.failures.values()][0]; }
}
