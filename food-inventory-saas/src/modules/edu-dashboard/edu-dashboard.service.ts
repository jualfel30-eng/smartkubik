import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import { EduStudent, EduStudentDocument } from "../../schemas/edu-student.schema";
import { EduClassroom, EduClassroomDocument } from "../../schemas/edu-classroom.schema";
import { EduTuitionFee, EduTuitionFeeDocument } from "../../schemas/edu-tuition-fee.schema";
import { EduGrade, EduGradeDocument } from "../../schemas/edu-grade.schema";
import { EduAttendance, EduAttendanceDocument } from "../../schemas/edu-attendance.schema";

@Injectable()
export class EduDashboardService {
  constructor(
    @InjectModel(EduStudent.name) private studentModel: Model<EduStudentDocument>,
    @InjectModel(EduClassroom.name) private classroomModel: Model<EduClassroomDocument>,
    @InjectModel(EduTuitionFee.name) private tuitionModel: Model<EduTuitionFeeDocument>,
    @InjectModel(EduGrade.name) private gradeModel: Model<EduGradeDocument>,
    @InjectModel(EduAttendance.name) private attendanceModel: Model<EduAttendanceDocument>,
  ) {}

  async getSummary(tenantId: string, academicYear: string) {
    const tenantObjId = new Types.ObjectId(tenantId);
    const dateStr = new Date().toISOString().split("T")[0];
    const todayStart = new Date(`${dateStr}T00:00:00.000Z`);
    const todayEnd = new Date(`${dateStr}T23:59:59.999Z`);

    const [studentResult, tuitionStats, attendanceMap, unpublishedGrades, classrooms] =
      await Promise.all([
        this.getStudentStats(tenantObjId, academicYear),
        this.getTuitionStats(tenantObjId, academicYear),
        this.getAttendanceByClassroom(tenantObjId, todayStart, todayEnd),
        this.getUnpublishedGradesCount(tenantObjId, academicYear),
        this.classroomModel
          .find({ tenantId: tenantObjId, academicYear, isDeleted: { $ne: true } })
          .lean()
          .exec(),
      ]);

    const { activeStudents, studentsByClassroom } = studentResult;
    const { overdueAmount, overdueCount, solventCount, overdueByClassroom } = tuitionStats;

    const presentToday = Object.values(attendanceMap).reduce((sum, v) => sum + v.present, 0);
    const attendanceTodayPct =
      activeStudents > 0 ? Math.round((presentToday / activeStudents) * 1000) / 10 : 0;

    const byClassroom = classrooms.map((cls) => {
      const clsId = (cls._id as Types.ObjectId).toString();
      const totalStudents = studentsByClassroom[clsId] ?? 0;
      const overdueStudents = overdueByClassroom[clsId] ?? 0;
      const presentTodayCls = attendanceMap[clsId]?.present ?? 0;
      const attPct =
        totalStudents > 0 ? Math.round((presentTodayCls / totalStudents) * 1000) / 10 : 0;

      return {
        classroomId: cls._id,
        name: cls.name,
        grade: cls.grade,
        section: cls.section,
        totalStudents,
        solventStudents: totalStudents - overdueStudents,
        overdueStudents,
        presentToday: presentTodayCls,
        attendancePct: attPct,
      };
    });

    return {
      totalStudents: activeStudents,
      activeStudents,
      solventCount,
      overdueCount,
      overdueAmount,
      attendanceTodayPct,
      unpublishedGrades,
      classroomCount: classrooms.length,
      byClassroom,
    };
  }

  // Kept for the root GET /education/dashboard endpoint
  async getDashboard(tenantId: string) {
    const year = new Date().getFullYear();
    return this.getSummary(tenantId, `${year}-${year + 1}`);
  }

  private async getStudentStats(tenantId: Types.ObjectId, academicYear: string) {
    const result = await this.studentModel.aggregate([
      {
        $match: {
          tenantId,
          academicYear,
          status: { $in: ["enrolled", "active"] },
          isDeleted: { $ne: true },
        },
      },
      {
        $facet: {
          total: [{ $count: "count" }],
          byClassroom: [{ $group: { _id: "$classroomId", count: { $sum: 1 } } }],
        },
      },
    ]);

    const { total = [], byClassroom = [] } = result[0] ?? {};
    const activeStudents: number = total[0]?.count ?? 0;
    const studentsByClassroom: Record<string, number> = {};
    for (const entry of byClassroom) {
      if (entry._id) studentsByClassroom[entry._id.toString()] = entry.count;
    }
    return { activeStudents, studentsByClassroom };
  }

  private async getTuitionStats(tenantId: Types.ObjectId, academicYear: string) {
    const [solvencyResult, overdueByClassroomResult] = await Promise.all([
      // Per-student overdue aggregation — distinguishes "students with overdue" from "overdue fees"
      this.tuitionModel.aggregate([
        { $match: { tenantId, academicYear, isDeleted: { $ne: true } } },
        {
          $group: {
            _id: "$studentId",
            hasOverdue: {
              $max: { $cond: [{ $eq: ["$status", "overdue"] }, 1, 0] },
            },
            overdueAmt: {
              $sum: { $cond: [{ $eq: ["$status", "overdue"] }, "$amount", 0] },
            },
          },
        },
        {
          $group: {
            _id: null,
            overdueStudents: { $sum: "$hasOverdue" },
            totalWithFees: { $sum: 1 },
            overdueAmount: { $sum: "$overdueAmt" },
          },
        },
      ]),
      // Unique overdue students per classroom
      this.tuitionModel.aggregate([
        {
          $match: {
            tenantId,
            academicYear,
            status: "overdue",
            isDeleted: { $ne: true },
          },
        },
        { $group: { _id: { cls: "$classroomId", stu: "$studentId" } } },
        { $group: { _id: "$_id.cls", count: { $sum: 1 } } },
      ]),
    ]);

    const solvency = solvencyResult[0];
    const overdueCount: number = solvency?.overdueStudents ?? 0;
    const overdueAmount: number = solvency?.overdueAmount ?? 0;
    const totalWithFees: number = solvency?.totalWithFees ?? 0;
    const solventCount = totalWithFees - overdueCount;

    const overdueByClassroom: Record<string, number> = {};
    for (const e of overdueByClassroomResult) {
      if (e._id) overdueByClassroom[e._id.toString()] = e.count;
    }

    return { overdueCount, overdueAmount, solventCount, overdueByClassroom };
  }

  private async getAttendanceByClassroom(
    tenantId: Types.ObjectId,
    todayStart: Date,
    todayEnd: Date,
  ): Promise<Record<string, { present: number }>> {
    const result = await this.attendanceModel.aggregate([
      {
        $match: {
          tenantId,
          date: { $gte: todayStart, $lte: todayEnd },
          isDeleted: { $ne: true },
        },
      },
      { $unwind: "$entries" },
      {
        $group: {
          _id: "$classroomId",
          present: {
            $sum: { $cond: [{ $eq: ["$entries.status", "present"] }, 1, 0] },
          },
        },
      },
    ]);

    const map: Record<string, { present: number }> = {};
    for (const e of result) {
      if (e._id) map[e._id.toString()] = { present: e.present };
    }
    return map;
  }

  private async getUnpublishedGradesCount(
    tenantId: Types.ObjectId,
    academicYear: string,
  ): Promise<number> {
    return this.gradeModel.countDocuments({
      tenantId,
      academicYear,
      isPublished: false,
      isDeleted: { $ne: true },
    });
  }
}
