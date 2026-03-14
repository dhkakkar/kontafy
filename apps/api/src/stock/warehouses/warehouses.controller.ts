import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiSecurity } from '@nestjs/swagger';
import { WarehousesService } from './warehouses.service';
import { OrgId } from '../../common/decorators/org-id.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import {
  createWarehouseSchema,
  updateWarehouseSchema,
  CreateWarehouseDto,
  UpdateWarehouseDto,
} from '../dto/warehouse.dto';

@ApiTags('Stock')
@ApiBearerAuth('access-token')
@ApiSecurity('org-id')
@Controller('stock/warehouses')
export class WarehousesController {
  constructor(private readonly warehousesService: WarehousesService) {}

  @Get()
  @ApiOperation({ summary: 'List warehouses with stock summary' })
  async findAll(@OrgId() orgId: string) {
    return this.warehousesService.findAll(orgId);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new warehouse' })
  async create(
    @OrgId() orgId: string,
    @Body(new ZodValidationPipe(createWarehouseSchema)) body: CreateWarehouseDto,
  ) {
    return this.warehousesService.create(orgId, body);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update warehouse' })
  async update(
    @OrgId() orgId: string,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateWarehouseSchema)) body: UpdateWarehouseDto,
  ) {
    return this.warehousesService.update(orgId, id, body);
  }
}
