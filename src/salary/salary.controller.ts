import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { IsBoolean, IsDateString, IsNumber, IsOptional, IsString, IsUUID, Min } from 'class-validator';
import { BackendAuthGuard } from '../auth/backend-auth.guard';
import { AdminGuard } from '../auth/admin.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { SalaryService } from './salary.service';

class AddDayDto {
  @IsUUID()
  worker_id: string;

  @IsDateString()
  work_date: string;

  @IsNumber()
  @Min(0)
  amount: number;

  @IsOptional()
  @IsString()
  note?: string;
}

class UpdateDayDto {
  @IsOptional()
  @IsNumber()
  @Min(0)
  amount?: number;

  @IsOptional()
  @IsString()
  note?: string;

  @IsOptional()
  @IsBoolean()
  paid?: boolean;
}

@ApiTags('salary')
@Controller('salary')
@UseGuards(BackendAuthGuard)
@ApiBearerAuth()
export class SalaryController {
  constructor(private readonly salaryService: SalaryService) {}

  @Get('me')
  @ApiOperation({ summary: 'My salary month (worker)' })
  async me(@CurrentUser() user: any, @Query('month') month?: string) {
    return this.salaryService.monthForWorker(user.id, month);
  }

  @Get('worker/:id')
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: "A worker's salary month (admin)" })
  async worker(@Param('id') id: string, @Query('month') month?: string) {
    return this.salaryService.monthForWorker(id, month);
  }

  @Post()
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: 'Add a paid work day for a worker (admin)' })
  async addDay(@Body() dto: AddDayDto, @CurrentUser() user: any) {
    return this.salaryService.addDay(dto, user.id);
  }

  @Patch(':id')
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: 'Update a work day: amount, note, paid (admin)' })
  async updateDay(@Param('id') id: string, @Body() dto: UpdateDayDto) {
    return this.salaryService.updateDay(id, dto);
  }

  @Delete(':id')
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: 'Delete a work day (admin)' })
  async deleteDay(@Param('id') id: string) {
    return this.salaryService.deleteDay(id);
  }

  @Post('worker/:id/pay-month')
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: "Mark a worker's whole month as paid (admin)" })
  async payMonth(@Param('id') id: string, @Query('month') month: string) {
    return this.salaryService.markMonthPaid(id, month);
  }
}
