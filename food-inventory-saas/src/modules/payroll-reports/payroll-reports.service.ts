import { Injectable, BadRequestException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import { PayrollRun, PayrollRunDocument } from "../../schemas/payroll-run.schema";
import {
  EmployeeAbsenceRequest,
  EmployeeAbsenceRequestDocument,
} from "../../schemas/employee-absence-request.schema";

interface DateFilters {
  from?: string;
  to?: string;
  department?: string;
  structureId?: string;
}

@Injectable()
export class PayrollReportsService {
  constructor(
    @InjectModel(PayrollRun.name)
    private readonly runModel: Model<PayrollRunDocument>,
    @InjectModel(EmployeeAbsenceRequest.name)
    private readonly absenceModel: Model<EmployeeAbsenceRequestDocument>,
  ) {}

  private toObjectId(id: string | Types.ObjectId) {
    return id instanceof Types.ObjectId ? id : new Types.ObjectId(id);
  }

  private buildDateMatch(filters: DateFilters, startField: string, endField?: string) {
    const match: Record<string, any> = {};
    if (filters.from) {
      match[startField] = { ...(match[startField] || {}), $gte: new Date(filters.from) };
    }
    if (filters.to) {
      const field = endField || startField;
      match[field] = { ...(match[field] || {}), $lte: new Date(filters.to) };
    }
    return match;
  }

  async summary(tenantId: string, filters: DateFilters) {
    const match: Record<string, any> = {
      tenantId: this.toObjectId(tenantId),
    };
    Object.assign(match, this.buildDateMatch(filters, "periodStart", "periodEnd"));
    const pipeline: any[] = [{ $match: match }];

    const runs = await this.runModel.aggregate([
      ...pipeline,
      {
        $project: {
          periodEnd: 1,
          grossPay: 1,
          deductions: 1,
          employerCosts: 1,
          netPay: 1,
          totalEmployees: 1,
          lines: 1,
        },
      },
    ]);

    const totals = runs.reduce(
      (acc, run) => {
        acc.grossPay += run.grossPay || 0;
        acc.deductions += run.deductions || 0;
        acc.employerCosts += run.employerCosts || 0;
        acc.netPay += run.netPay || 0;
        acc.employees += run.totalEmployees || 0;
        return acc;
      },
      { grossPay: 0, deductions: 0, employerCosts: 0, netPay: 0, employees: 0 },
    );

    const series = runs.map((run) => ({
      periodEnd: run.periodEnd,
      grossPay: run.grossPay || 0,
      deductions: run.deductions || 0,
      employerCosts: run.employerCosts || 0,
      netPay: run.netPay || 0,
      employees: run.totalEmployees || 0,
    }));

    const deptTotals: Record<string, any> = {};
    runs.forEach((run) => {
      const lines = Array.isArray(run.lines) ? run.lines : [];
      lines.forEach((line) => {
        const dept = line.department || "Sin depto";
        const deptAcc = (deptTotals[dept] = deptTotals[dept] || {
          grossPay: 0,
          deductions: 0,
          employerCosts: 0,
          netPay: 0,
          employees: 0,
        });
        deptAcc.grossPay += line.grossPay || 0;
        deptAcc.deductions += line.deductionsTotal || 0;
        deptAcc.employerCosts += line.employerCostsTotal || 0;
        deptAcc.netPay += line.netPay || 0;
        deptAcc.employees += 1;
      });
    });

    const byDepartment = Object.entries(deptTotals).map(([name, vals]) => ({
      department: name,
      ...vals,
    }));

    return { totals, series, byDepartment };
  }

  async deductionsBreakdown(tenantId: string, filters: DateFilters) {
    const match: Record<string, any> = {
      tenantId: this.toObjectId(tenantId),
    };
    Object.assign(match, this.buildDateMatch(filters, "periodStart", "periodEnd"));

    const pipeline: any[] = [
      { $match: match },
      { $unwind: { path: "$entries", preserveNullAndEmptyArrays: false } },
      {
        $match: {
          "entries.conceptType": { $in: ["deduction", "employer"] },
        },
      },
      {
        $group: {
          _id: "$entries.conceptCode",
          total: { $sum: "$entries.amount" },
          conceptName: { $first: "$entries.conceptName" },
          conceptType: { $first: "$entries.conceptType" },
        },
      },
      { $sort: { total: -1 } },
      { $limit: 20 },
    ];

    const data = await this.runModel.aggregate(pipeline);
    return { concepts: data };
  }

  async absenteeism(tenantId: string, filters: DateFilters) {
    const match: Record<string, any> = {
      tenantId: this.toObjectId(tenantId),
      status: "approved",
    };
    Object.assign(match, this.buildDateMatch(filters, "startDate", "endDate"));

    const absences = await this.absenceModel.aggregate([
      { $match: match },
      {
        $project: {
          employeeId: 1,
          employeeName: 1,
          leaveType: 1,
          totalDays: 1,
          startDate: 1,
          endDate: 1,
        },
      },
    ]);

    const byLeaveType: Record<string, number> = {};
    absences.forEach((a) => {
      byLeaveType[a.leaveType] = (byLeaveType[a.leaveType] || 0) + (a.totalDays || 0);
    });
    const byEmployee: Record<string, any> = {};
    absences.forEach((a) => {
      const key = (a.employeeId || "").toString();
      const row = (byEmployee[key] = byEmployee[key] || {
        employeeId: key,
        employeeName: a.employeeName || "Sin nombre",
        totalDays: 0,
        requests: 0,
        leaveTypes: {},
      });
      row.totalDays += a.totalDays || 0;
      row.requests += 1;
      row.leaveTypes[a.leaveType] = (row.leaveTypes[a.leaveType] || 0) + (a.totalDays || 0);
    });

    return {
      totals: {
        totalRequests: absences.length,
        totalDays: absences.reduce((s, a) => s + (a.totalDays || 0), 0),
      },
      byLeaveType: Object.entries(byLeaveType).map(([leaveType, days]) => ({
        leaveType,
        days,
      })),
      byEmployee: Object.values(byEmployee),
    };
  }
}
