import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
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

    response.status(status).json({
      error: {
        code: status,
        message,
        details,
      },
    });
  }
}
