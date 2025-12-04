import { Injectable, NotFoundException, Logger } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import {
  EmailTemplate,
  EmailTemplateDocument,
} from "../../schemas/email-template.schema";
import {
  CreateEmailTemplateDto,
  UpdateEmailTemplateDto,
  GetTemplatesQueryDto,
} from "../../dto/email-template.dto";

/**
 * PHASE 7: EMAIL/SMS TEMPLATES & DELIVERY SYSTEM
 * TemplateService - Gestión de plantillas de email/SMS
 */

@Injectable()
export class TemplateService {
  private readonly logger = new Logger(TemplateService.name);

  constructor(
    @InjectModel(EmailTemplate.name)
    private templateModel: Model<EmailTemplateDocument>,
  ) {}

  /**
   * Create a new template
   */
  async create(
    tenantId: string,
    userId: string,
    createDto: CreateEmailTemplateDto,
  ): Promise<EmailTemplate> {
    const template = new this.templateModel({
      ...createDto,
      tenantId: new Types.ObjectId(tenantId),
      createdBy: new Types.ObjectId(userId),
      lastModifiedBy: new Types.ObjectId(userId),
      version: 1,
      usageCount: 0,
    });

    const saved = await template.save();
    this.logger.log(`Template created: ${saved.name} (${saved._id})`);
    return saved;
  }

  /**
   * Get all templates with filters
   */
  async findAll(
    tenantId: string,
    query: GetTemplatesQueryDto,
  ): Promise<{ templates: EmailTemplate[]; total: number }> {
    const filter: any = {
      tenantId: new Types.ObjectId(tenantId),
    };

    if (query.status) {
      filter.status = query.status;
    }

    if (query.category) {
      filter.category = query.category;
    }

    if (query.isDefault !== undefined) {
      filter.isDefault = query.isDefault;
    }

    if (query.search) {
      filter.$or = [
        { name: { $regex: query.search, $options: "i" } },
        { description: { $regex: query.search, $options: "i" } },
      ];
    }

    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const [templates, total] = await Promise.all([
      this.templateModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.templateModel.countDocuments(filter).exec(),
    ]);

    return { templates, total };
  }

  /**
   * Get template by ID
   */
  async findById(
    tenantId: string,
    templateId: string,
  ): Promise<EmailTemplateDocument> {
    const template = await this.templateModel
      .findOne({
        _id: new Types.ObjectId(templateId),
        tenantId: new Types.ObjectId(tenantId),
      })
      .exec();

    if (!template) {
      throw new NotFoundException("Template not found");
    }

    return template;
  }

  /**
   * Update template
   */
  async update(
    tenantId: string,
    templateId: string,
    userId: string,
    updateDto: UpdateEmailTemplateDto,
  ): Promise<EmailTemplate> {
    const template = await this.findById(tenantId, templateId);

    // Create new version if template is already in use
    if (template.usageCount > 0 && !template.isDefault) {
      this.logger.log(
        `Creating new version of template ${template.name} (usage count: ${template.usageCount})`,
      );

      // Archive old version
      template.previousVersionId = template._id as Types.ObjectId;
      template.version = (template.version || 1) + 1;
    }

    Object.assign(template, updateDto);
    template.lastModifiedBy = new Types.ObjectId(userId);

    const updated = await template.save();
    this.logger.log(`Template updated: ${updated.name} (${updated._id})`);
    return updated;
  }

  /**
   * Delete template
   */
  async delete(tenantId: string, templateId: string): Promise<void> {
    const result = await this.templateModel
      .deleteOne({
        _id: new Types.ObjectId(templateId),
        tenantId: new Types.ObjectId(tenantId),
      })
      .exec();

    if (result.deletedCount === 0) {
      throw new NotFoundException("Template not found");
    }

    this.logger.log(`Template deleted: ${templateId}`);
  }

  /**
   * Duplicate template
   */
  async duplicate(
    tenantId: string,
    templateId: string,
    newName: string,
    userId: string,
  ): Promise<EmailTemplate> {
    const original = await this.findById(tenantId, templateId);

    const duplicate = new this.templateModel({
      tenantId: original.tenantId,
      name: newName,
      description: original.description
        ? `Copy of ${original.description}`
        : undefined,
      category: original.category,
      subject: original.subject,
      preheader: original.preheader,
      htmlContent: original.htmlContent,
      textContent: original.textContent,
      variables: original.variables,
      design: original.design,
      socialLinks: original.socialLinks,
      status: "draft", // Always create as draft
      tags: original.tags,
      createdBy: new Types.ObjectId(userId),
      lastModifiedBy: new Types.ObjectId(userId),
      version: 1,
      usageCount: 0,
    });

    const saved = await duplicate.save();
    this.logger.log(
      `Template duplicated: ${original.name} -> ${saved.name} (${saved._id})`,
    );
    return saved;
  }

  /**
   * Render template with context (replace variables)
   */
  renderTemplate(htmlContent: string, context: Record<string, any>): string {
    let rendered = htmlContent;

    // Replace {{variable}} with context values
    for (const [key, value] of Object.entries(context)) {
      const regex = new RegExp(`{{\\s*${key}\\s*}}`, "g");
      rendered = rendered.replace(regex, String(value || ""));
    }

    // Remove any unmatched variables (optional)
    rendered = rendered.replace(/{{.*?}}/g, "");

    return rendered;
  }

  /**
   * Extract variables from template content
   */
  extractVariables(htmlContent: string): string[] {
    const regex = /{{\\s*([\\w_]+)\\s*}}/g;
    const variables: string[] = [];
    let match;

    while ((match = regex.exec(htmlContent)) !== null) {
      if (!variables.includes(match[1])) {
        variables.push(match[1]);
      }
    }

    return variables;
  }

  /**
   * Validate template (check for required variables, valid HTML, etc.)
   */
  validateTemplate(template: EmailTemplate): {
    valid: boolean;
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check required fields
    if (!template.name || template.name.trim() === "") {
      errors.push("Template name is required");
    }

    if (!template.htmlContent || template.htmlContent.trim() === "") {
      errors.push("HTML content is required");
    }

    // Extract variables from HTML
    const extractedVars = this.extractVariables(template.htmlContent || "");

    // Check if declared variables match extracted variables
    const declaredVars = template.variables || [];

    for (const extractedVar of extractedVars) {
      if (!declaredVars.includes(extractedVar)) {
        warnings.push(`Variable {{${extractedVar}}} is used but not declared`);
      }
    }

    for (const declaredVar of declaredVars) {
      if (!extractedVars.includes(declaredVar)) {
        warnings.push(`Variable ${declaredVar} is declared but not used`);
      }
    }

    // Check for basic HTML structure (for emails)
    if (template.htmlContent) {
      const hasHtmlTag = /<html/i.test(template.htmlContent);
      const hasBodyTag = /<body/i.test(template.htmlContent);

      if (!hasHtmlTag) {
        warnings.push("Missing <html> tag - may cause rendering issues");
      }

      if (!hasBodyTag) {
        warnings.push("Missing <body> tag - may cause rendering issues");
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Increment usage count when template is used
   */
  async incrementUsage(tenantId: string, templateId: string): Promise<void> {
    await this.templateModel
      .findOneAndUpdate(
        {
          _id: new Types.ObjectId(templateId),
          tenantId: new Types.ObjectId(tenantId),
        },
        {
          $inc: { usageCount: 1 },
          $set: { lastUsedAt: new Date() },
        },
      )
      .exec();
  }

  /**
   * Get template preview with sample data
   */
  async getPreview(
    tenantId: string,
    templateId: string,
    sampleContext?: Record<string, any>,
  ): Promise<{ html: string; text: string; variables: string[] }> {
    const template = await this.findById(tenantId, templateId);

    // Default sample context
    const defaultContext = {
      customerName: "John Doe",
      hotelName: "SmartKubik Restaurant",
      date: new Date().toLocaleDateString(),
      orderNumber: "ORD-12345",
      orderTotal: "$50.00",
      productName: "Sample Product",
      discountCode: "SAVE20",
      ...sampleContext,
    };

    const renderedHtml = this.renderTemplate(
      template.htmlContent,
      defaultContext,
    );
    const renderedText = template.textContent
      ? this.renderTemplate(template.textContent, defaultContext)
      : "";

    return {
      html: renderedHtml,
      text: renderedText,
      variables: template.variables || [],
    };
  }
}
