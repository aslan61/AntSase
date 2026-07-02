export class AppError extends Error {
  public constructor(
    public readonly statusCode: number,
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export class NotFoundError extends AppError {
  public constructor(resource: string) {
    super(404, 'NOT_FOUND', `${resource} bulunamadı.`);
  }
}
