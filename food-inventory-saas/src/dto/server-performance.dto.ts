import {
  IsString,
  IsNumber,
  IsOptional,
  IsMongoId,
  IsDateString,
  Min,
  Max,
  IsArray,
} from "class-validator";

// DTO para crear/actualizar registro de performance
export class CreateServerPerformanceDto {
  @IsMongoId()
  serverId: string;

  @IsDateString()
  date: string;

  @IsOptional()
  @IsMongoId()
  shiftId?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  ordersServed?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  totalSales?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  tablesServed?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  guestsServed?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  tipsReceived?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  hoursWorked?: number;

  @IsOptional()
  @IsDateString()
  shiftStart?: string;

  @IsOptional()
  @IsDateString()
  shiftEnd?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(5)
  averageRating?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  ratingsCount?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  complaintsReceived?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  complimentsReceived?: number;

  @IsOptional()
  @IsString()
  managerNotes?: string;

  @IsOptional()
  @IsString()
  performanceGrade?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  achievements?: string[];
}

export class UpdateServerPerformanceDto {
  @IsOptional()
  @IsNumber()
  @Min(0)
  ordersServed?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  totalSales?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  tablesServed?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  guestsServed?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  tipsReceived?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  hoursWorked?: number;

  @IsOptional()
  @IsDateString()
  shiftStart?: string;

  @IsOptional()
  @IsDateString()
  shiftEnd?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(5)
  averageRating?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  ratingsCount?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  complaintsReceived?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  complimentsReceived?: number;

  @IsOptional()
  @IsString()
  managerNotes?: string;

  @IsOptional()
  @IsString()
  performanceGrade?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  achievements?: string[];
}

// Query para filtrar performance
export class ServerPerformanceQueryDto {
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsMongoId()
  serverId?: string;

  @IsOptional()
  @IsMongoId()
  shiftId?: string;

  @IsOptional()
  @IsString()
  performanceGrade?: string;
}

// DTO para establecer metas
export class SetServerGoalsDto {
  @IsMongoId()
  serverId: string;

  @IsDateString()
  date: string;

  @IsNumber()
  @Min(0)
  salesTarget: number;

  @IsNumber()
  @Min(0)
  ordersTarget: number;
}

// Response de analytics
export interface ServerPerformanceAnalyticsResponse {
  period: {
    start: Date;
    end: Date;
  };
  summary: {
    totalServers: number;
    totalSales: number;
    totalOrders: number;
    totalTips: number;
    averageRating: number;
    totalHoursWorked: number;
  };
  topPerformers: Array<{
    serverId: string;
    serverName: string;
    totalSales: number;
    totalOrders: number;
    totalTips: number;
    averageRating: number;
    performanceScore: number;
  }>;
  byServer: Array<{
    serverId: string;
    serverName: string;
    ordersServed: number;
    totalSales: number;
    averageOrderValue: number;
    tipsReceived: number;
    tipPercentage: number;
    salesPerHour: number;
    averageRating: number;
    tablesServed: number;
    guestsServed: number;
    hoursWorked: number;
    performanceGrade: string;
  }>;
  trends: {
    dailyAverage: {
      sales: number;
      orders: number;
      tips: number;
    };
    weekOverWeek: {
      salesChange: number;
      ordersChange: number;
      tipsChange: number;
    };
  };
  goalProgress: Array<{
    serverId: string;
    serverName: string;
    salesTarget: number;
    salesAchieved: number;
    salesProgress: number;
    ordersTarget: number;
    ordersAchieved: number;
    ordersProgress: number;
  }>;
}

// Response de comparación de servidores
export interface ServerComparisonResponse {
  servers: Array<{
    serverId: string;
    serverName: string;
    metrics: {
      totalSales: number;
      ordersServed: number;
      averageOrderValue: number;
      tipsReceived: number;
      tipPercentage: number;
      salesPerHour: number;
      tablesPerHour: number;
      averageRating: number;
      orderErrorRate: number;
      guestsServed: number;
    };
    ranking: {
      overallRank: number;
      salesRank: number;
      satisfactionRank: number;
      efficiencyRank: number;
    };
  }>;
  period: {
    start: Date;
    end: Date;
  };
}

// Response de leaderboard
export interface ServerLeaderboardResponse {
  period: {
    start: Date;
    end: Date;
  };
  categories: {
    topBySales: Array<{
      rank: number;
      serverId: string;
      serverName: string;
      value: number;
    }>;
    topByTips: Array<{
      rank: number;
      serverId: string;
      serverName: string;
      value: number;
    }>;
    topByRating: Array<{
      rank: number;
      serverId: string;
      serverName: string;
      value: number;
    }>;
    topByEfficiency: Array<{
      rank: number;
      serverId: string;
      serverName: string;
      value: number; // sales per hour
    }>;
  };
}
