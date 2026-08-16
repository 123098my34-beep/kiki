import { useState, useEffect } from 'react';

export function useLivePacing(tenantId: string, initialPacingData: any) {
  const [pacingData, setPacingData] = useState(initialPacingData);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (!tenantId) return;

    const eventSource = new EventSource(`/api/v1/stream/events/${tenantId}`);

    eventSource.onopen = () => setIsConnected(true);
    eventSource.onerror = () => setIsConnected(false);

    eventSource.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        if (message.type === 'PACING_UPDATE') {
          setPacingData((prev: any) => ({
            ...prev,
            ...message.data
          }));
        }
      } catch (err) {
        console.error('Failed to parse SSE event payload', err);
      }
    };

    return () => {
      eventSource.close();
    };
  }, [tenantId]);

  return { pacingData, isConnected };
}
