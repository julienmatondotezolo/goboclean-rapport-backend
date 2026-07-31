import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AdminService } from './admin.service';
import { BackendAuthGuard } from '../auth/backend-auth.guard';

/**
 * Infos société (nom, IBAN…) pour tous les utilisateurs authentifiés —
 * nécessaires aux ouvriers sur le terrain pour générer le QR de paiement SEPA
 * à l'étape Paiement de la clôture.
 */
@ApiTags('company')
@Controller('company')
@UseGuards(BackendAuthGuard)
@ApiBearerAuth()
export class CompanyController {
  constructor(private adminService: AdminService) {}

  @Get()
  @ApiOperation({ summary: 'Company settings (name, iban) — any authenticated user' })
  async getCompany() {
    return await this.adminService.getCompany();
  }
}
