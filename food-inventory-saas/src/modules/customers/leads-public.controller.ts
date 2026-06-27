import { Body, Controller, Post } from "@nestjs/common";
import { ApiTags, ApiOperation } from "@nestjs/swagger";
import { Public } from "../../decorators/public.decorator";
import { CustomersService } from "./customers.service";
import { CreatePublicLeadDto } from "./dto/create-public-lead.dto";

/**
 * Captura de leads desde storefronts públicos (form de contacto).
 * Sin auth: el tenant llega en el body (tenantId).
 */
@ApiTags("Leads (Public)")
@Public()
@Controller("public/leads")
export class LeadsPublicController {
  constructor(private readonly customersService: CustomersService) {}

  @Post()
  @ApiOperation({ summary: "Crear lead desde storefront (público)" })
  async create(@Body() dto: CreatePublicLeadDto) {
    return this.customersService.createLead(dto);
  }
}
