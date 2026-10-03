import { useState } from 'react';

export function useAIClearingPrice() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState<string | null>(null);

  async function compute(intents: any) {
    setLoading(true);
    setError(null);
    try {
      const resp = await fetch('/api/ai/compute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ intents })
      });
      if (!resp.ok) {
        const t = await resp.text();
        throw new Error(t || 'AI compute failed');
      }
      const j = await resp.json();
      setResult(j);
      setLoading(false);
      return j;
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : String(e);
      setError(message);
      setLoading(false);
      throw e;
    }
  }

  return { compute, loading, result, error };
}
