import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      let message: string;
      let details: any = null;

      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
      } else if (typeof exceptionResponse === 'object') {
        const resp = exceptionResponse as Record<string, any>;
        message = resp.message || exception.message;
        details = resp.errors || resp.details || null;
      } else {
        message = exception.message;
      }

      response.status(status).send({
        error: {
          code: status,
          message,
          details,
        },
      });
    } else {
      // Unexpected errors: log full details, return generic message
      this.logger.error(
        'Unhandled exception',
        exception instanceof Error ? exception.stack : String(exception),
      );

      response.status(HttpStatus.INTERNAL_SERVER_ERROR).send({
        error: {
          code: HttpStatus.INTERNAL_SERVER_ERROR,
          message: 'Error interno del servidor.',
        },
      });
    }
  }
}
