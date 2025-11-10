import { Controller, Get } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse } from "@nestjs/swagger";
import { FeatureFlagsService } from "../../config/feature-flags.service";
import { Public } from "../../decorators/public.decorator";

@ApiTags("Feature Flags")
@Controller("feature-flags")
export class FeatureFlagsController {
  constructor(private readonly featureFlagsService: FeatureFlagsService) {}

  @Public()
  @Get()
  @ApiOperation({
    summary: "Get all feature flags status (public endpoint)",
  })
  @ApiResponse({
    status: 200,
    description: "Feature flags retrieved successfully.",
  })
  async getFeatureFlags() {
    const flags = await this.featureFlagsService.getFeatureFlags();
    return { data: flags };
  }
}
