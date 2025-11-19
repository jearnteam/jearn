let es: EventSource | null = null;
let listeners: ((data: any) => void)[] = [];

export function getSSE() {
  if (!es) {
    es = new EventSource("/api/stream");

    es.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        listeners.forEach((fn) => fn(data));
      } catch (e) {
        console.error("SSE parse error", e);
      }
    };

    es.onerror = () => console.warn("SSE Error");
  }

  return {
    subscribe(fn: (data: any) => void) {
      listeners.push(fn);

      return () => {
        listeners = listeners.filter((x) => x !== fn);
      };
    },
  };
}
