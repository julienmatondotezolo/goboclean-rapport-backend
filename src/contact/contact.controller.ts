import { Body, Controller, Headers, HttpCode, HttpException, HttpStatus, Ip, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { EmailService } from '../email/email.service';
import { ContactRequestDto } from './contact.dto';

const WINDOW_MS = 60 * 60 * 1000;
const MAX_PER_WINDOW = 5;

/**
 * Formulaire de devis du site vitrine (www.goboclean.be) — endpoint PUBLIC.
 * Anti-spam : honeypot `website` + 5 demandes / heure / IP (mémoire du process).
 * L'IP vient de X-Real-IP, posé par nginx sur le VPS (non falsifiable par le client).
 */
@ApiTags('Contact')
@Controller('contact')
export class ContactController {
  private readonly hits = new Map<string, number[]>();

  constructor(private readonly emailService: EmailService) {}

  @Post()
  @HttpCode(200)
  @ApiOperation({ summary: 'Demande de devis du site vitrine (public)' })
  async submit(
    @Body() body: ContactRequestDto,
    @Ip() socketIp: string,
    @Headers('x-real-ip') realIp?: string,
  ) {
    const ip = realIp || socketIp;
    // Robot : on répond OK sans rien envoyer.
    if (body.website) return { ok: true };

    const now = Date.now();
    const recent = (this.hits.get(ip) || []).filter((t) => now - t < WINDOW_MS);
    if (recent.length >= MAX_PER_WINDOW) {
      throw new HttpException('Trop de demandes, réessayez plus tard.', HttpStatus.TOO_MANY_REQUESTS);
    }
    recent.push(now);
    this.hits.set(ip, recent);

    await this.emailService.sendContactRequest(body);
    return { ok: true };
  }
}
