export class ConfigurationError extends Error {
  constructor() {
    super('Missing required environment variables');
    this.name = 'ConfigurationError';
  }
}
