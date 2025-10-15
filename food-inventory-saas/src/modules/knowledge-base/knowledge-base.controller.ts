
import { Controller, Post, UseInterceptors, UploadedFile, Req, UseGuards, BadRequestException, Body } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { KnowledgeBaseService } from './knowledge-base.service';
import { JwtAuthGuard } from '../../guards/jwt-auth.guard';
import { ApiTags, ApiOperation, ApiConsumes, ApiBody, ApiBearerAuth } from '@nestjs/swagger';
import { Request } from 'express';

// Define a type for the request object to include the user property
interface AuthenticatedRequest extends Request {
  user: {
    tenantId: string;
  };
}

@ApiTags('Knowledge Base')
@ApiBearerAuth()
@Controller('knowledge-base')
export class KnowledgeBaseController {
  constructor(private readonly knowledgeBaseService: KnowledgeBaseService) {}

  @Post('upload')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Upload a document to the knowledge base' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: 'Document file to upload (PDF or TXT)',
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
        source: { // Example of an additional metadata field
          type: 'string',
          description: 'The source of the document, e.g., a URL or filename.',
          example: 'menu_verano_2024.pdf',
        }
      },
    },
  })
  async uploadDocument(
    @UploadedFile() file: Express.Multer.File,
    @Req() req: AuthenticatedRequest,
    @Body('source') source?: string,
  ) {
    if (!file) {
      throw new BadRequestException('No file uploaded.');
    }

    const { tenantId } = req.user;
    const metadata = { source: source || file.originalname };

    await this.knowledgeBaseService.addDocument(tenantId, file, metadata);

    return { message: 'Document uploaded and processed successfully.' };
  }
}
