
import { Body, Controller, Post, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { MailService } from './mail.service';

export class ContactFormDto {
    name: string;
    email: string;
    phone?: string;
    companyName?: string;
    vertical?: string;
    state?: string;
    city?: string;
    message: string;
    type: 'sales' | 'general';
}

@Controller('public')
export class MailPublicController {
    private readonly logger = new Logger(MailPublicController.name);

    constructor(private readonly mailService: MailService) { }

    @Post('contact')
    async submitContactForm(@Body() dto: ContactFormDto) {
        this.logger.log(`Received contact form submission: ${dto.type} from ${dto.email}`);

        try {
            // Determine destination based on type
            // sales -> ventas@smartkubik.com
            // general -> contacto@smartkubik.com
            const to = dto.type === 'sales'
                ? 'ventas@smartkubik.com'
                : 'contacto@smartkubik.com';

            const subjectPrefix = dto.type === 'sales' ? '🚀 Nueva Oportunidad de Venta:' : '📩 Nuevo Mensaje de Contacto:';
            const subject = `${subjectPrefix} ${dto.companyName || dto.name}`;

            // Build HTML Content
            const htmlContent = `
        <div style="font-family: sans-serif; padding: 20px; border: 1px solid #e5e7eb; border-radius: 8px;">
          <h2 style="color: #4f46e5;">${subject}</h2>
          
          <div style="margin-bottom: 20px; background-color: #f9fafb; padding: 15px; border-radius: 6px;">
            <p><strong>De:</strong> ${dto.name} (${dto.email})</p>
            ${dto.phone ? `<p><strong>Teléfono:</strong> ${dto.phone}</p>` : ''}
            ${dto.companyName ? `<p><strong>Empresa:</strong> ${dto.companyName}</p>` : ''}
            ${dto.vertical ? `<p><strong>Vertical:</strong> ${dto.vertical}</p>` : ''}
            ${dto.state || dto.city ? `<p><strong>Ubicación:</strong> ${dto.city ? dto.city + ', ' : ''}${dto.state || ''}</p>` : ''}
          </div>

          <h3 style="margin-top: 20px;">Mensaje:</h3>
          <p style="background-color: #f3f4f6; padding: 15px; border-radius: 6px; white-space: pre-wrap;">${dto.message}</p>
          
          <hr style="margin: 20px 0; border-top: 1px solid #e5e7eb;" />
          <p style="color: #6b7280; font-size: 12px; text-align: center;">
            Enviado desde el formulario web de SmartKubik (Tipo: ${dto.type})
          </p>
        </div>
      `;

            await this.mailService.sendTemplatedEmail({
                to: to, // Destination (our internal email)
                subject: subject,
                html: htmlContent,
                // We could set replyTo in the service if needed, but for now basic forwarding works.
                // The service implementation handles 'from' as configured in .env
            });

            return { success: true, message: 'Message sent successfully' };
        } catch (error) {
            this.logger.error(`Failed to send contact email: ${error.message}`, error.stack);
            throw new HttpException('Failed to send message', HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
}
