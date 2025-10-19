import { Test, TestingModule } from "@nestjs/testing";
import { PayablesService } from "./payables.service";
import { getModelToken } from "@nestjs/mongoose";
import { Payable } from "../../schemas/payable.schema";
import { AccountingService } from "../accounting/accounting.service";
import { EventsService } from "../events/events.service";

const mockPayableModel = {
  new: jest.fn(),
  constructor: jest.fn(),
  find: jest.fn(),
  findOne: jest.fn(),
  save: jest.fn(),
  create: jest.fn(),
};

const mockAccountingService = {
  createJournalEntryForPayable: jest.fn(),
};

const mockEventsService = {
  create: jest.fn(),
};

describe("PayablesService", () => {
  let service: PayablesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PayablesService,
        {
          provide: getModelToken(Payable.name),
          useValue: mockPayableModel,
        },
        {
          provide: AccountingService,
          useValue: mockAccountingService,
        },
        {
          provide: EventsService,
          useValue: mockEventsService,
        },
      ],
    }).compile();

    service = module.get<PayablesService>(PayablesService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });
});
