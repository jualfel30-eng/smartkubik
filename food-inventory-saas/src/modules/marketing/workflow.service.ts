import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import { Cron, CronExpression } from "@nestjs/schedule";
import {
  MarketingWorkflow,
  MarketingWorkflowDocument,
  WorkflowStatus,
  WorkflowStepType,
  ConditionOperator,
} from "../../schemas/marketing-workflow.schema";
import {
  WorkflowExecution,
  WorkflowExecutionDocument,
  ExecutionStatus,
} from "../../schemas/workflow-execution.schema";
import { Customer, CustomerDocument } from "../../schemas/customer.schema";
import {
  CreateWorkflowDto,
  UpdateWorkflowDto,
  EnrollCustomerDto,
} from "../../dto/marketing-workflow.dto";

@Injectable()
export class WorkflowService {
  private readonly logger = new Logger(WorkflowService.name);

  constructor(
    @InjectModel(MarketingWorkflow.name)
    private workflowModel: Model<MarketingWorkflowDocument>,
    @InjectModel(WorkflowExecution.name)
    private executionModel: Model<WorkflowExecutionDocument>,
    @InjectModel(Customer.name)
    private customerModel: Model<CustomerDocument>,
  ) {}

  /**
   * Create a new workflow
   */
  async createWorkflow(
    dto: CreateWorkflowDto,
    tenantId: string,
    userId: string,
  ): Promise<MarketingWorkflow> {
    const tenantObjectId = new Types.ObjectId(tenantId);
    const userObjectId = new Types.ObjectId(userId);

    // Validate workflow structure
    this.validateWorkflowStructure(dto);

    // Convert WorkflowStepDto[] to WorkflowStep[] (convert string IDs to ObjectIds)
    const steps = dto.steps.map((step) => ({
      ...step,
      campaignId: step.campaignId
        ? new Types.ObjectId(step.campaignId)
        : undefined,
    }));

    const workflow = await this.workflowModel.create({
      tenantId: tenantObjectId,
      name: dto.name,
      description: dto.description,
      status: WorkflowStatus.DRAFT,
      triggerType: dto.triggerType,
      triggerConfig: dto.triggerConfig,
      steps: steps as any,
      firstStepId: dto.firstStepId || dto.steps[0]?.id,
      entryCriteria: dto.entryCriteria,
      exitConditions: dto.exitConditions,
      allowReEntry: dto.allowReEntry || false,
      reEntryDelayHours: dto.reEntryDelayHours,
      totalEntered: 0,
      totalCompleted: 0,
      totalExited: 0,
      activeCustomers: 0,
      createdBy: userObjectId,
    });

    this.logger.log(`Created workflow ${workflow._id}: ${workflow.name}`);

    return workflow;
  }

  /**
   * Update a workflow
   */
  async updateWorkflow(
    workflowId: string,
    dto: UpdateWorkflowDto,
    tenantId: string,
    userId: string,
  ): Promise<MarketingWorkflow> {
    const workflow = await this.workflowModel.findOne({
      _id: new Types.ObjectId(workflowId),
      tenantId: new Types.ObjectId(tenantId),
    });

    if (!workflow) {
      throw new NotFoundException("Workflow not found");
    }

    // Can't update active workflow structure
    if (workflow.status === WorkflowStatus.ACTIVE && dto.steps) {
      throw new BadRequestException(
        "Cannot update steps of an active workflow. Pause it first.",
      );
    }

    // Update fields
    if (dto.name) workflow.name = dto.name;
    if (dto.description !== undefined) workflow.description = dto.description;
    if (dto.status) workflow.status = dto.status;
    if (dto.triggerType) workflow.triggerType = dto.triggerType;
    if (dto.triggerConfig) workflow.triggerConfig = dto.triggerConfig;
    if (dto.steps) {
      this.validateWorkflowStructure({ ...workflow.toObject(), ...dto } as any);
      // Convert WorkflowStepDto[] to WorkflowStep[] (convert string IDs to ObjectIds)
      workflow.steps = dto.steps.map((step) => ({
        ...step,
        campaignId: step.campaignId
          ? new Types.ObjectId(step.campaignId)
          : undefined,
      })) as any;
    }
    if (dto.firstStepId) workflow.firstStepId = dto.firstStepId;
    if (dto.entryCriteria) workflow.entryCriteria = dto.entryCriteria;
    if (dto.exitConditions) workflow.exitConditions = dto.exitConditions;
    if (dto.allowReEntry !== undefined)
      workflow.allowReEntry = dto.allowReEntry;
    if (dto.reEntryDelayHours !== undefined)
      workflow.reEntryDelayHours = dto.reEntryDelayHours;

    workflow.lastModifiedBy = new Types.ObjectId(userId);

    await workflow.save();

    this.logger.log(`Updated workflow ${workflowId}`);

    return workflow;
  }

  /**
   * Get a workflow by ID
   */
  async getWorkflow(
    workflowId: string,
    tenantId: string,
  ): Promise<MarketingWorkflow> {
    const workflow = await this.workflowModel
      .findOne({
        _id: new Types.ObjectId(workflowId),
        tenantId: new Types.ObjectId(tenantId),
      })
      .lean();

    if (!workflow) {
      throw new NotFoundException("Workflow not found");
    }

    return workflow;
  }

  /**
   * Get all workflows for a tenant
   */
  async getWorkflows(
    tenantId: string,
    filters?: any,
  ): Promise<MarketingWorkflow[]> {
    const query: any = { tenantId: new Types.ObjectId(tenantId) };

    if (filters?.status) {
      query.status = filters.status;
    }
    if (filters?.triggerType) {
      query.triggerType = filters.triggerType;
    }

    const workflows = await this.workflowModel
      .find(query)
      .sort({ createdAt: -1 })
      .lean();

    return workflows;
  }

  /**
   * Delete a workflow
   */
  async deleteWorkflow(workflowId: string, tenantId: string): Promise<void> {
    const workflow = await this.workflowModel.findOne({
      _id: new Types.ObjectId(workflowId),
      tenantId: new Types.ObjectId(tenantId),
    });

    if (!workflow) {
      throw new NotFoundException("Workflow not found");
    }

    // Can't delete active workflow with active executions
    if (
      workflow.status === WorkflowStatus.ACTIVE &&
      workflow.activeCustomers > 0
    ) {
      throw new BadRequestException(
        "Cannot delete workflow with active executions. Pause it first and wait for executions to complete.",
      );
    }

    await this.workflowModel.deleteOne({
      _id: workflow._id,
      tenantId: new Types.ObjectId(tenantId),
    });

    this.logger.log(`Deleted workflow ${workflowId}`);
  }

  /**
   * Activate a workflow
   */
  async activateWorkflow(
    workflowId: string,
    tenantId: string,
  ): Promise<MarketingWorkflow> {
    const workflow = await this.workflowModel.findOneAndUpdate(
      {
        _id: new Types.ObjectId(workflowId),
        tenantId: new Types.ObjectId(tenantId),
      },
      { $set: { status: WorkflowStatus.ACTIVE } },
      { new: true },
    );

    if (!workflow) {
      throw new NotFoundException("Workflow not found");
    }

    this.logger.log(`Activated workflow ${workflowId}`);
    return workflow;
  }

  /**
   * Pause a workflow
   */
  async pauseWorkflow(
    workflowId: string,
    tenantId: string,
  ): Promise<MarketingWorkflow> {
    const workflow = await this.workflowModel.findOneAndUpdate(
      {
        _id: new Types.ObjectId(workflowId),
        tenantId: new Types.ObjectId(tenantId),
      },
      { $set: { status: WorkflowStatus.PAUSED } },
      { new: true },
    );

    if (!workflow) {
      throw new NotFoundException("Workflow not found");
    }

    this.logger.log(`Paused workflow ${workflowId}`);
    return workflow;
  }

  /**
   * Enroll a customer in a workflow
   */
  async enrollCustomer(
    dto: EnrollCustomerDto,
    tenantId: string,
  ): Promise<WorkflowExecution> {
    const tenantObjectId = new Types.ObjectId(tenantId);
    const workflowObjectId = new Types.ObjectId(dto.workflowId);
    const customerObjectId = new Types.ObjectId(dto.customerId);

    // Get workflow
    const workflow = await this.workflowModel.findOne({
      _id: workflowObjectId,
      tenantId: tenantObjectId,
    });

    if (!workflow) {
      throw new NotFoundException("Workflow not found");
    }

    if (workflow.status !== WorkflowStatus.ACTIVE) {
      throw new BadRequestException("Workflow is not active");
    }

    // Get customer
    const customer = await this.customerModel.findOne({
      _id: customerObjectId,
      tenantId: tenantObjectId,
    });

    if (!customer) {
      throw new NotFoundException("Customer not found");
    }

    // Check entry criteria
    if (!this.checkEntryCriteria(customer, workflow.entryCriteria)) {
      throw new BadRequestException("Customer does not meet entry criteria");
    }

    // Check if already enrolled
    const existingExecution = await this.executionModel.findOne({
      workflowId: workflowObjectId,
      customerId: customerObjectId,
      status: ExecutionStatus.ACTIVE,
    });

    if (existingExecution) {
      throw new BadRequestException(
        "Customer is already enrolled in this workflow",
      );
    }

    // Check re-entry rules
    if (!workflow.allowReEntry) {
      const previousExecution = await this.executionModel.findOne({
        workflowId: workflowObjectId,
        customerId: customerObjectId,
        status: { $in: [ExecutionStatus.COMPLETED, ExecutionStatus.EXITED] },
      });

      if (previousExecution) {
        throw new BadRequestException(
          "Customer has already completed this workflow and re-entry is not allowed",
        );
      }
    } else if (workflow.reEntryDelayHours) {
      const previousExecution = await this.executionModel
        .findOne({
          workflowId: workflowObjectId,
          customerId: customerObjectId,
          status: { $in: [ExecutionStatus.COMPLETED, ExecutionStatus.EXITED] },
        })
        .sort({ completedAt: -1 });

      if (previousExecution && previousExecution.completedAt) {
        const hoursSinceCompletion =
          (Date.now() - previousExecution.completedAt.getTime()) /
          (1000 * 60 * 60);

        if (hoursSinceCompletion < workflow.reEntryDelayHours) {
          throw new BadRequestException(
            `Customer must wait ${workflow.reEntryDelayHours} hours before re-entering this workflow`,
          );
        }
      }
    }

    // Create execution
    const execution = await this.executionModel.create({
      tenantId: tenantObjectId,
      workflowId: workflowObjectId,
      customerId: customerObjectId,
      status: ExecutionStatus.ACTIVE,
      startedAt: new Date(),
      currentStepId: workflow.firstStepId,
      stepExecutions: [],
      contextData: dto.contextData || {},
    });

    // Update workflow stats
    await this.workflowModel.updateOne(
      { _id: workflowObjectId },
      {
        $inc: { totalEntered: 1, activeCustomers: 1 },
      },
    );

    this.logger.log(
      `Enrolled customer ${dto.customerId} in workflow ${dto.workflowId}`,
    );

    // Execute first step
    await this.executeNextStep(execution._id.toString());

    return execution;
  }

  /**
   * Cron job to process pending workflow executions (runs every minute)
   */
  @Cron(CronExpression.EVERY_MINUTE)
  async processPendingExecutions() {
    this.logger.debug("Processing pending workflow executions...");

    try {
      const now = new Date();

      // Find executions that are waiting and ready to continue
      const readyExecutions = await this.executionModel.find({
        status: ExecutionStatus.ACTIVE,
        nextExecutionAt: { $lte: now },
      });

      this.logger.log(`Found ${readyExecutions.length} ready executions`);

      for (const execution of readyExecutions) {
        try {
          await this.executeNextStep(execution._id.toString());
        } catch (error: any) {
          this.logger.error(
            `Error processing execution ${execution._id}: ${error.message}`,
            error.stack,
          );
        }
      }
    } catch (error: any) {
      this.logger.error(
        `Error in processPendingExecutions: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Execute the next step in a workflow execution
   */
  private async executeNextStep(executionId: string): Promise<void> {
    const execution = await this.executionModel.findById(executionId);

    if (!execution || execution.status !== ExecutionStatus.ACTIVE) {
      return;
    }

    const workflow = await this.workflowModel.findById(execution.workflowId);

    if (!workflow) {
      throw new NotFoundException("Workflow not found");
    }

    // Check if workflow is still active
    if (workflow.status !== WorkflowStatus.ACTIVE) {
      execution.status = ExecutionStatus.PAUSED;
      await execution.save();
      return;
    }

    // Get current step
    const currentStep = workflow.steps.find(
      (s) => s.id === execution.currentStepId,
    );

    if (!currentStep) {
      // No more steps, workflow completed
      await this.completeExecution(execution._id.toString());
      return;
    }

    this.logger.log(
      `Executing step ${currentStep.id} (${currentStep.type}) for execution ${executionId}`,
    );

    try {
      let nextStepId: string | undefined = currentStep.nextStepId;

      // Execute step based on type
      switch (currentStep.type) {
        case WorkflowStepType.SEND_EMAIL:
        case WorkflowStepType.SEND_SMS:
        case WorkflowStepType.SEND_WHATSAPP:
          // TODO: Integrate with actual sending logic
          this.logger.log(`Would send ${currentStep.type} to customer`);
          break;

        case WorkflowStepType.WAIT:
          if (currentStep.waitDuration) {
            const nextExecutionAt = new Date();
            nextExecutionAt.setHours(
              nextExecutionAt.getHours() + currentStep.waitDuration,
            );

            execution.nextExecutionAt = nextExecutionAt;
            execution.currentStepId = currentStep.nextStepId;

            execution.stepExecutions.push({
              stepId: currentStep.id,
              stepName: currentStep.name,
              executedAt: new Date(),
              success: true,
              nextStepId: currentStep.nextStepId,
            });

            await execution.save();
            this.logger.log(`Wait step: will resume at ${nextExecutionAt}`);
            return; // Stop here, will resume later
          }
          break;

        case WorkflowStepType.CONDITION:
          const customer = await this.customerModel.findById(
            execution.customerId,
          );
          if (customer && currentStep.condition) {
            const conditionMet = this.evaluateCondition(
              customer,
              currentStep.condition,
            );
            nextStepId = conditionMet
              ? currentStep.trueStepId
              : currentStep.falseStepId;
            this.logger.log(
              `Condition result: ${conditionMet}, next step: ${nextStepId}`,
            );
          }
          break;

        case WorkflowStepType.ADD_TAG:
          // TODO: Implement tag management
          this.logger.log(`Would add tags: ${currentStep.tags?.join(", ")}`);
          break;

        case WorkflowStepType.REMOVE_TAG:
          // TODO: Implement tag management
          this.logger.log(`Would remove tags: ${currentStep.tags?.join(", ")}`);
          break;

        case WorkflowStepType.UPDATE_SEGMENT:
          // TODO: Implement segment update
          this.logger.log(`Would update segment: ${currentStep.segmentId}`);
          break;

        case WorkflowStepType.WEBHOOK:
          // TODO: Implement webhook call
          this.logger.log(`Would call webhook: ${currentStep.webhookUrl}`);
          break;
      }

      // Record step execution
      execution.stepExecutions.push({
        stepId: currentStep.id,
        stepName: currentStep.name,
        executedAt: new Date(),
        success: true,
        nextStepId,
      });

      // Move to next step
      if (nextStepId) {
        execution.currentStepId = nextStepId;
        execution.nextExecutionAt = new Date(); // Execute immediately
        await execution.save();

        // Continue to next step
        await this.executeNextStep(executionId);
      } else {
        // No next step, complete workflow
        await this.completeExecution(executionId);
      }
    } catch (error: any) {
      this.logger.error(
        `Error executing step ${currentStep.id}: ${error.message}`,
        error.stack,
      );

      execution.lastError = error.message;
      execution.errorCount += 1;

      execution.stepExecutions.push({
        stepId: currentStep.id,
        stepName: currentStep.name,
        executedAt: new Date(),
        success: false,
        error: error.message,
      });

      // If too many errors, fail the execution
      if (execution.errorCount >= 5) {
        execution.status = ExecutionStatus.FAILED;

        await this.workflowModel.updateOne(
          { _id: execution.workflowId },
          { $inc: { activeCustomers: -1 } },
        );
      }

      await execution.save();
    }
  }

  /**
   * Complete a workflow execution
   */
  private async completeExecution(executionId: string): Promise<void> {
    const execution = await this.executionModel.findById(executionId);

    if (!execution) {
      return;
    }

    execution.status = ExecutionStatus.COMPLETED;
    execution.completedAt = new Date();
    await execution.save();

    // Update workflow stats
    await this.workflowModel.updateOne(
      { _id: execution.workflowId },
      {
        $inc: { totalCompleted: 1, activeCustomers: -1 },
      },
    );

    this.logger.log(`Completed execution ${executionId}`);
  }

  /**
   * Check if customer meets entry criteria
   */
  private checkEntryCriteria(customer: any, criteria?: any): boolean {
    if (!criteria) {
      return true; // No criteria means everyone can enter
    }

    // Check segments
    if (criteria.segmentIds && criteria.segmentIds.length > 0) {
      // TODO: Check if customer is in any of the segments
    }

    // Check tiers
    if (criteria.customerTiers && criteria.customerTiers.length > 0) {
      if (!criteria.customerTiers.includes(customer.tier)) {
        return false;
      }
    }

    // Check total spent
    if (
      criteria.minTotalSpent !== undefined &&
      customer.metrics.totalSpent < criteria.minTotalSpent
    ) {
      return false;
    }
    if (
      criteria.maxTotalSpent !== undefined &&
      customer.metrics.totalSpent > criteria.maxTotalSpent
    ) {
      return false;
    }

    // Check total orders
    if (
      criteria.minTotalOrders !== undefined &&
      customer.metrics.totalOrders < criteria.minTotalOrders
    ) {
      return false;
    }
    if (
      criteria.maxTotalOrders !== undefined &&
      customer.metrics.totalOrders > criteria.maxTotalOrders
    ) {
      return false;
    }

    return true;
  }

  /**
   * Evaluate a condition
   */
  private evaluateCondition(customer: any, condition: any): boolean {
    const { field, operator, value } = condition;

    // Get field value from customer (supports nested fields with dot notation)
    const fieldValue = this.getNestedValue(customer, field);

    switch (operator) {
      case ConditionOperator.EQUALS:
        return fieldValue === value;

      case ConditionOperator.NOT_EQUALS:
        return fieldValue !== value;

      case ConditionOperator.GREATER_THAN:
        return fieldValue > value;

      case ConditionOperator.LESS_THAN:
        return fieldValue < value;

      case ConditionOperator.CONTAINS:
        return String(fieldValue).includes(String(value));

      case ConditionOperator.NOT_CONTAINS:
        return !String(fieldValue).includes(String(value));

      case ConditionOperator.IN:
        return Array.isArray(value) && value.includes(fieldValue);

      case ConditionOperator.NOT_IN:
        return Array.isArray(value) && !value.includes(fieldValue);

      default:
        return false;
    }
  }

  /**
   * Get nested value from object using dot notation
   */
  private getNestedValue(obj: any, path: string): any {
    return path.split(".").reduce((current, prop) => current?.[prop], obj);
  }

  /**
   * Validate workflow structure
   */
  private validateWorkflowStructure(
    dto: CreateWorkflowDto | UpdateWorkflowDto,
  ): void {
    if (!dto.steps || dto.steps.length === 0) {
      throw new BadRequestException("Workflow must have at least one step");
    }

    // Check for duplicate step IDs
    const stepIds = dto.steps.map((s) => s.id);
    const uniqueIds = new Set(stepIds);
    if (stepIds.length !== uniqueIds.size) {
      throw new BadRequestException("Duplicate step IDs found");
    }

    // Validate step references
    for (const step of dto.steps) {
      if (step.nextStepId && !stepIds.includes(step.nextStepId)) {
        throw new BadRequestException(
          `Step ${step.id} references non-existent step ${step.nextStepId}`,
        );
      }

      if (step.type === WorkflowStepType.CONDITION) {
        if (step.trueStepId && !stepIds.includes(step.trueStepId)) {
          throw new BadRequestException(
            `Step ${step.id} references non-existent trueStepId ${step.trueStepId}`,
          );
        }
        if (step.falseStepId && !stepIds.includes(step.falseStepId)) {
          throw new BadRequestException(
            `Step ${step.id} references non-existent falseStepId ${step.falseStepId}`,
          );
        }
      }
    }
  }
}
