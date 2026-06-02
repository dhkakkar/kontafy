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
  @ApiOperation({
    summary: 'List warehouses with stock summary',
    description:
      'Returns each warehouse along with a count of distinct SKUs held and the total inventory valuation at that location. Use this to power warehouse pickers and the warehouse overview screen.',
  })
  async findAll(@OrgId() orgId: string) {
    return this.warehousesService.findAll(orgId);
  }

  @Post()
  @ApiOperation({
    summary: 'Create a new warehouse',
    description:
      'Adds a stock location (godown, retail store, branch, etc.). The first warehouse created becomes the org\'s default for opening stock and ad-hoc movements; you can change which one is default by patching `is_default`.',
  })
  async create(
    @OrgId() orgId: string,
    @Body(new ZodValidationPipe(createWarehouseSchema)) body: CreateWarehouseDto,
  ) {
    return this.warehousesService.create(orgId, body);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Update warehouse',
    description:
      'Patches the warehouse name, address or default flag. Setting `is_default: true` automatically clears the flag on the previously-default warehouse so exactly one location remains the default at all times.',
  })
  async update(
    @OrgId() orgId: string,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateWarehouseSchema)) body: UpdateWarehouseDto,
  ) {
    return this.warehousesService.update(orgId, id, body);
  }
}
