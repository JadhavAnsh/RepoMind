import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Response } from 'express';

export interface ApiResponseEnvelope<T> {
  success: boolean;
  message: string;
  data: T;
}

@Injectable()
export class ApiResponseInterceptor<T> implements NestInterceptor<T, ApiResponseEnvelope<T> | T> {
  intercept(context: ExecutionContext, next: CallHandler): Observable<ApiResponseEnvelope<T> | T> {
    const ctx = context.switchToHttp();
    const response = ctx.getResponse<Response>();

    return next.handle().pipe(
      map((data) => {
        // If status code is 204 or redirect, pass through
        if (response.statusCode >= 300 && response.statusCode < 400) {
          return data;
        }

        // If response is already wrapped, return as is
        if (data && typeof data === 'object' && 'success' in data) {
          return data;
        }

        return {
          success: true,
          message: 'Request successful',
          data: data ?? null,
        };
      }),
    );
  }
}
