import { Module } from '@nestjs/common';
import { ProductsController } from './products/products.controller';
import { ProductsService } from './products/products.service';
import { WarehousesController } from './warehouses/warehouses.controller';
import { WarehousesService } from './warehouses/warehouses.service';
import { StockMovementsController } from './movements/stock-movements.controller';
import { StockMovementsService } from './movements/stock-movements.service';

@Module({
  controllers: [ProductsController, WarehousesController, StockMovementsController],
  providers: [ProductsService, WarehousesService, StockMovementsService],
  exports: [ProductsService, WarehousesService, StockMovementsService],
})
export class StockModule {}
