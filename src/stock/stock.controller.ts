import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { IsIn, IsNumber, IsOptional, IsPositive, IsString, IsUUID, Min } from 'class-validator';
import { BackendAuthGuard } from '../auth/backend-auth.guard';
import { AdminGuard } from '../auth/admin.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { StockService } from './stock.service';

class ConsumeDto {
  @IsString()
  item_id: string;

  @IsNumber()
  @IsPositive()
  units: number;

  @IsOptional()
  @IsUUID()
  mission_id?: string;

  @IsOptional()
  @IsString()
  note?: string;
}

class RestockDto {
  @IsString()
  item_id: string;

  @IsNumber()
  @IsPositive()
  units: number;

  @IsOptional()
  @IsString()
  note?: string;
}

class UpdateItemDto {
  @IsOptional()
  @IsNumber()
  @Min(0)
  quantity?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  threshold?: number;
}

@ApiTags('stock')
@Controller('stock')
@UseGuards(BackendAuthGuard)
@ApiBearerAuth()
export class StockController {
  constructor(private readonly stockService: StockService) {}

  @Get()
  @ApiOperation({ summary: 'Stock levels (all authenticated users)' })
  async list() {
    return this.stockService.listItems();
  }

  @Post('consume')
  @ApiOperation({ summary: 'Worker declares product used on a mission (deducted from stock)' })
  async consume(@Body() dto: ConsumeDto, @CurrentUser() user: any) {
    return this.stockService.move(dto.item_id, -dto.units, user.id, dto.mission_id, dto.note);
  }

  @Post('restock')
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: 'Admin adds units to stock' })
  async restock(@Body() dto: RestockDto, @CurrentUser() user: any) {
    return this.stockService.move(dto.item_id, dto.units, user.id, undefined, dto.note ?? 'restock');
  }

  @Patch(':id')
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: 'Admin sets quantity/threshold' })
  async update(@Param('id') id: string, @Body() dto: UpdateItemDto) {
    return this.stockService.updateItem(id, dto);
  }

  @Get('movements')
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: 'Movement history (admin)' })
  async movements(@Query('item_id') itemId?: string) {
    return this.stockService.listMovements(itemId);
  }
}
