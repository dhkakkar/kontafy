import {
  PipeTransform,
  Injectable,
  BadRequestException,
  ArgumentMetadata,
} from '@nestjs/common';
import { ZodSchema, ZodError } from 'zod';

/**
 * ZodValidationPipe — validates request body/query/params against a Zod schema.
 *
 * Usage:
 *   @Post()
 *   create(@Body(new ZodValidationPipe(createInvoiceSchema)) dto: CreateInvoiceDto) { ... }
 *
 * Or as a route-level pipe:
 *   @UsePipes(new ZodValidationPipe(mySchema))
 */
@Injectable()
export class ZodValidationPipe implements PipeTransform {
  constructor(private schema: ZodSchema) {}

  transform(value: unknown, metadata: ArgumentMetadata) {
    try {
      const result = this.schema.parse(value);
      return result;
    } catch (error) {
      if (error instanceof ZodError) {
        const formattedErrors = error.errors.map((err) => ({
          field: err.path.join('.'),
          message: err.message,
          code: err.code,
        }));

        throw new BadRequestException({
          message: 'Validation failed',
          error: 'VALIDATION_ERROR',
          details: formattedErrors,
        });
      }
      throw new BadRequestException('Validation failed');
    }
  }
}
