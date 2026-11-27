/** Agrupa los cambios y guarda de uno en uno. */
export class Autosave {
  private timer: ReturnType<typeof setTimeout> | null = null;
  private chain: Promise<boolean> = Promise.resolve(true);

  constructor(
    private save: () => Promise<void>,
    private report: (ok: boolean) => void,
    private delay = 400,
  ) {}

  schedule(): void {
    if (this.timer !== null) clearTimeout(this.timer);
    this.timer = setTimeout(() => void this.flush(), this.delay);
  }

  /** Guarda ya. Devuelve false si no se ha podido. */
  flush(): Promise<boolean> {
    if (this.timer !== null) clearTimeout(this.timer);
    this.timer = null;
    this.chain = this.chain.then(async () => {
      try {
        await this.save();
        this.report(true);
        return true;
      } catch (error) {
        console.error(error);
        this.report(false);
        return false;
      }
    });
    return this.chain;
  }
}
