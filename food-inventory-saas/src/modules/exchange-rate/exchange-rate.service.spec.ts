import { Test, TestingModule } from '@nestjs/testing';
import { ExchangeRateService } from './exchange-rate.service';
import axios from 'axios';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('ExchangeRateService', () => {
  let service: ExchangeRateService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ExchangeRateService],
    }).compile();

    service = module.get<ExchangeRateService>(ExchangeRateService);

    // Reset cache before each test
    (service as any).cachedRate = null;
    (service as any).cacheExpiry = null;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getBCVRate', () => {
    it('should return cached rate when cache is valid', async () => {
      // Arrange
      const cachedRate = {
        rate: 45.5,
        lastUpdate: new Date(),
        source: 'BCV (cached)',
      };

      const futureExpiry = new Date(Date.now() + 60000); // 1 minute in future

      (service as any).cachedRate = cachedRate;
      (service as any).cacheExpiry = futureExpiry;

      // Act
      const result = await service.getBCVRate();

      // Assert
      expect(result).toEqual(cachedRate);
      expect(mockedAxios.get).not.toHaveBeenCalled();
    });

    it('should fetch from first API when cache is expired', async () => {
      // Arrange
      const mockResponse = {
        data: {
          promedio: '48.75',
          fechaActualizacion: '2025-12-05T12:00:00Z',
        },
      };

      mockedAxios.get.mockResolvedValue(mockResponse);

      // Act
      const result = await service.getBCVRate();

      // Assert
      expect(result).toBeDefined();
      expect(result.rate).toBe(48.75);
      expect(result.source).toContain('DolarAPI Venezuela');
      expect(mockedAxios.get).toHaveBeenCalledWith(
        'https://ve.dolarapi.com/v1/dolares/oficial',
        { timeout: 5000 },
      );
    });

    it('should fallback to second API when first API fails', async () => {
      // Arrange
      const mockSecondAPIResponse = {
        data: {
          monitors: {
            bcv: {
              price: '49.25',
              last_update: '2025-12-05T12:00:00Z',
            },
          },
        },
      };

      mockedAxios.get
        .mockRejectedValueOnce(new Error('First API failed'))
        .mockResolvedValueOnce(mockSecondAPIResponse);

      // Act
      const result = await service.getBCVRate();

      // Assert
      expect(result).toBeDefined();
      expect(result.rate).toBe(49.25);
      expect(result.source).toContain('BCV Monitor');
      expect(mockedAxios.get).toHaveBeenCalledTimes(2);
    });

    it('should return stale cached rate when all APIs fail', async () => {
      // Arrange
      const staleCache = {
        rate: 47.0,
        lastUpdate: new Date('2025-12-04'),
        source: 'BCV (via DolarAPI Venezuela)',
      };

      (service as any).cachedRate = staleCache;
      (service as any).cacheExpiry = new Date(Date.now() - 1000); // Expired cache

      mockedAxios.get
        .mockRejectedValueOnce(new Error('First API failed'))
        .mockRejectedValueOnce(new Error('Second API failed'));

      // Act
      const result = await service.getBCVRate();

      // Assert
      expect(result).toBeDefined();
      expect(result.rate).toBe(47.0);
      expect(result.source).toContain('cached - all APIs unavailable');
    });

    it('should return fallback rate when all APIs fail and no cache exists', async () => {
      // Arrange
      mockedAxios.get
        .mockRejectedValueOnce(new Error('First API failed'))
        .mockRejectedValueOnce(new Error('Second API failed'));

      // Act
      const result = await service.getBCVRate();

      // Assert
      expect(result).toBeDefined();
      expect(result.rate).toBe(52.0); // Default fallback rate
      expect(result.source).toContain('fallback rate - all APIs unavailable');
      expect(result.lastUpdate).toBeDefined();
    });
  });
});
