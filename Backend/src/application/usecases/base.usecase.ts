export class BaseUseCase {
  protected notFound(message = 'Not found'): never {
    throw { status: 404, message };
  }

  protected conflict(message = 'Conflict'): never {
    throw { status: 409, message };
  }

  protected badRequest(message: string): never {
    throw { status: 400, message };
  }

  protected unauthorized(message = 'Unauthorized'): never {
    throw { status: 401, message };
  }
}
