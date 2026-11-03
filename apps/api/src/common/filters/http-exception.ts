export class AppError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public errorCode: string | null = null,
  ) {
    super(message);
    this.name = 'AppError';
  }
}
