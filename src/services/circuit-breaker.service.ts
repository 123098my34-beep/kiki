export class CircuitBreakerService {
  private static circuits = new Map<string, {
    state: 'CLOSED' | 'OPEN' | 'HALF_OPEN';
    failureCount: number;
    lastFailureTime: number;
  }>();

  private static FAILURE_THRESHOLD = 5;
  private static COOLDOWN_PERIOD_MS = 30000; // 30 seconds

  static async execute<T>(
    serviceName: string,
    operation: () => Promise<T>,
    fallback: (err?: Error) => T
  ): Promise<T> {
    if (!this.circuits.has(serviceName)) {
      this.circuits.set(serviceName, { state: 'CLOSED', failureCount: 0, lastFailureTime: 0 });
    }

    const circuit = this.circuits.get(serviceName)!;

    // Check if cooldown expired
    if (circuit.state === 'OPEN') {
      if (Date.now() - circuit.lastFailureTime > this.COOLDOWN_PERIOD_MS) {
        circuit.state = 'HALF_OPEN';
        console.log(`[CircuitBreaker] ${serviceName} shifted to HALF_OPEN (probing recovery)`);
      } else {
        console.warn(`[CircuitBreaker] ${serviceName} is OPEN. Returning fallback.`);
        return fallback(new Error(`Circuit ${serviceName} is currently OPEN`));
      }
    }

    try {
      const result = await operation();
      if (circuit.state === 'HALF_OPEN') {
        circuit.state = 'CLOSED';
        circuit.failureCount = 0;
        console.log(`[CircuitBreaker] ${serviceName} recovered to CLOSED.`);
      }
      return result;
    } catch (err: any) {
      circuit.failureCount++;
      circuit.lastFailureTime = Date.now();

      if (circuit.failureCount >= this.FAILURE_THRESHOLD) {
        circuit.state = 'OPEN';
        console.error(`[CircuitBreaker] ${serviceName} tripped to OPEN after ${circuit.failureCount} consecutive failures.`);
      }

      return fallback(err);
    }
  }

  static getStatus(serviceName: string) {
    return this.circuits.get(serviceName) || { state: 'CLOSED', failureCount: 0 };
  }
}
