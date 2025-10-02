import { Test, TestingModule } from '@nestjs/testing';
import { PayablesController } from './payables.controller';

describe('PayablesController', () => {
  let controller: PayablesController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PayablesController],
    }).compile();

    controller = module.get<PayablesController>(PayablesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
