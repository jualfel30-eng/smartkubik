import { BadRequestException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { TaskQueueService } from "src/modules/task-queue/task-queue.service";

type ConfigOverrides = Record<string, string | undefined>;

type MongoJobModelMock = {
  create: jest.Mock;
  findOneAndUpdate: jest.Mock;
  updateMany: jest.Mock;
  findById: jest.Mock;
  findByIdAndUpdate: jest.Mock;
  deleteOne: jest.Mock;
  countDocuments: jest.Mock;
  findOne: jest.Mock;
  find: jest.Mock;
};

function createConfigMock(overrides: ConfigOverrides = {}): ConfigService {
  return {
    get: jest.fn((key: string) => overrides[key]) as unknown as ConfigService["get"],
  } as unknown as ConfigService;
}

function createMongoJobModel(): MongoJobModelMock {
  const execResolved = <T>(value: T) => ({ exec: jest.fn().mockResolvedValue(value) });

  return {
    create: jest.fn().mockResolvedValue(undefined),
    findOneAndUpdate: jest.fn().mockImplementation(() => execResolved(null)),
    updateMany: jest
      .fn()
      .mockImplementation(() => execResolved({ modifiedCount: 0 })),
    findById: jest.fn().mockImplementation(() => execResolved(null)),
    findByIdAndUpdate: jest.fn().mockImplementation(() => execResolved(null)),
    deleteOne: jest
      .fn()
      .mockImplementation(() => execResolved({ deletedCount: 1 })),
    countDocuments: jest
      .fn()
      .mockImplementation(() => execResolved(0)),
    findOne: jest.fn().mockImplementation(() => {
      const lean = jest.fn().mockImplementation(() => execResolved(null));
      const select = jest.fn().mockImplementation(() => ({ lean }));
      const sort = jest.fn().mockImplementation(() => ({ select }));
      return { sort };
    }),
    find: jest.fn().mockImplementation(() => {
      const lean = jest.fn().mockImplementation(() => execResolved([]));
      const limit = jest.fn().mockImplementation(() => ({ lean }));
      const skip = jest.fn().mockImplementation(() => ({ limit }));
      const sort = jest.fn().mockImplementation(() => ({ skip }));
      return { sort };
    }),
  } as unknown as MongoJobModelMock;
}

describe("TaskQueueService - memory driver", () => {
  let config: ConfigService;
  let jobModel: MongoJobModelMock;
  let service: TaskQueueService;

  beforeEach(() => {
    config = createConfigMock();
    jobModel = { create: jest.fn() } as unknown as MongoJobModelMock;
    service = new TaskQueueService(config, jobModel as never);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("processes jobs immediately when a handler is registered", async () => {
    const handler = jest.fn().mockResolvedValue(undefined);
    service.registerHandler("order-accounting", handler as never);

    await service.enqueueOrderAccounting("order-123", "tenant-456", "manual");
    await new Promise((resolve) => setImmediate(resolve));

    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledWith({
      orderId: "order-123",
      tenantId: "tenant-456",
      trigger: "manual",
    });
  });

  it("throws when retrying jobs on a non-persistent driver", async () => {
    await expect(service.retryJob("job-1")).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });
});

describe("TaskQueueService - mongo driver", () => {
  let config: ConfigService;
  let jobModel: MongoJobModelMock;
  let service: TaskQueueService;

  beforeEach(() => {
    config = createConfigMock({ QUEUE_DRIVER: "mongo" });
    jobModel = createMongoJobModel();
    service = new TaskQueueService(config, jobModel as never);
    (service as unknown as { processMongoQueue: jest.Mock }).processMongoQueue = jest
      .fn()
      .mockResolvedValue(undefined);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("persists new jobs before triggering processing", async () => {
    const handler = jest.fn().mockResolvedValue(undefined);
    service.registerHandler("inventory-maintenance", handler as never);

    await service.enqueueInventoryMaintenance("inv-1", "tenant-1", {
      trigger: "low-stock",
      userId: "user-99",
    });

    expect(jobModel.create).toHaveBeenCalledTimes(1);
    expect(jobModel.create).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "inventory-maintenance",
        payload: {
          inventoryId: "inv-1",
          tenantId: "tenant-1",
          trigger: "low-stock",
          userId: "user-99",
        },
        status: "pending",
        attempts: 0,
        availableAt: expect.any(Date),
      }),
    );
    expect(
      (service as unknown as { processMongoQueue: jest.Mock }).processMongoQueue,
    ).toHaveBeenCalled();
  });

  it("resets job state when retrying a persisted job", async () => {
    const job = {
      _id: "job-123",
      type: "order-accounting",
      attempts: 2,
    };
    jobModel.findById.mockImplementation(() => ({
      exec: jest.fn().mockResolvedValue(job),
    }));

    await service.retryJob("job-123");

    expect(jobModel.findByIdAndUpdate).toHaveBeenCalledWith(
      "job-123",
      expect.objectContaining({
        status: "pending",
        attempts: 0,
        lockedAt: null,
        errorMessage: null,
      }),
    );
    expect(
      (service as unknown as { processMongoQueue: jest.Mock }).processMongoQueue,
    ).toHaveBeenCalled();
  });
});
