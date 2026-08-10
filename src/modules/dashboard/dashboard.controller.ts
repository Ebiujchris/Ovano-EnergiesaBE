import { Controller, Get, UseGuards, Req, Query } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('dashboard')
@UseGuards(JwtAuthGuard)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get()
  getDashboardData(@Req() req: any) {
    // If staff, return their personal dashboard
    if (req.user.accountType === 'staff') {
      return this.dashboardService.getStaffDashboard(req.user.shopId, req.user.id);
    }
    // Owner sees full business dashboard
    return this.dashboardService.getDashboardData(req.user.shopId);
  }

  @Get('staff/:staffId')
  getStaffDashboard(@Req() req: any) {
    // Allow owner to view any staff member's dashboard
    return this.dashboardService.getStaffDashboard(req.user.shopId, req.params.staffId);
  }

  @Get('analytics')
  getAnalytics(
    @Query('period') period: 'week' | 'month' | 'year' = 'month',
    @Req() req: any,
  ) {
    return this.dashboardService.getAnalytics(req.user.shopId, period);
  }

  @Get('balance-sheet')
  getBalanceSheet(@Req() req: any) {
    return this.dashboardService.getBalanceSheet(req.user.shopId);
  }

  @Get('cash-flow')
  getCashFlow(
    @Query('year') year: string,
    @Req() req: any,
  ) {
    return this.dashboardService.getCashFlow(req.user.shopId, year ? parseInt(year) : undefined);
  }

  @Get('income-comparison')
  getIncomeComparison(@Req() req: any) {
    return this.dashboardService.getIncomeComparison(req.user.shopId);
  }
}