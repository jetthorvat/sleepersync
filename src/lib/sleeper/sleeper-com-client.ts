const SLEEPER_COM_BASE = "https://api.sleeper.com";

export class SleeperComError extends Error {
  constructor(
    message: string,
    public status?: number,
  ) {
    super(message);
    this.name = "SleeperComError";
  }
}

export async function sleeperComFetch<T>(path: string): Promise<T> {
  const res = await fetch(`${SLEEPER_COM_BASE}${path}`, {
    headers: { Accept: "application/json" },
    next: { revalidate: 0 },
  });

  if (!res.ok) {
    throw new SleeperComError(`Sleeper.com API error: ${res.status}`, res.status);
  }

  return res.json() as Promise<T>;
}
