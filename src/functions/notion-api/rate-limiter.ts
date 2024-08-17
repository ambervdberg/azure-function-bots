/**
 * Class to handle API rate limiting by queuing API calls and processing them at a controlled rate.
 *
 * The Notion API has a rate limit of 3 requests per second.
 * Exceeding this limit will result in a 429 (Too Many Requests) error.
 */
class ApiRateLimiter {
  private readonly queue: (() => Promise<void>)[] = [];
  private activeCalls: number = 0;

  // The maximum number of API calls to start per second. Notion API has a rate limit of 3 requests per second.
  private readonly maxCallsPerSecond: number = 3;

  /**
   * Adds an API call to the queue and processes the queue.
   *
   * @param apiCall
   * @returns A promise that resolves with the result of the API call.
   */
  async enqueue<T>(apiCall: () => Promise<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      this.queue.push(async () => {
        try {
          resolve(await apiCall());
        } catch (error) {
          reject(error);
        } finally {
          this.activeCalls--;
          this.processQueue();
        }
      });
      this.processQueue();
    });
  }

  /**
   * Processes the queue.
   * No more than `maxCallsPerSecond` API calls are started concurrently.
   */
  private async processQueue(): Promise<void> {
    while (this.queue.length > 0 && this.activeCalls < this.maxCallsPerSecond) {
      const call = this.queue.shift(); // Get the next call from the queue

      if (call) {
        this.activeCalls++;
        call(); // Start the call without waiting for it to complete
      }
    }
  }
}

const sharedRateLimiter = new ApiRateLimiter();

export { sharedRateLimiter };
