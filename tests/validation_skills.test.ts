/**
 * Unit tests for Validation Skills
 *
 * Mocks SDK to test query logic.
 */

const mockQuery = jest.fn();
const mockController = { query: mockQuery };

jest.mock('../src/utils/entrypoint', () => ({
    createEntrypoint: () => ({
        createSmartContractController: jest.fn(() => mockController),
        createSmartContractTransactionsFactory: jest.fn(),
    }),
}));

jest.mock('../src/utils/abi', () => ({
    createPatchedAbi: jest.fn(() => ({})),
}));

import { isJobVerified, getJobData } from '../src/skills/validation_skills';

describe('Validation Skills', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('isJobVerified', () => {
        it('should return true when job is verified', async () => {
            mockQuery.mockResolvedValueOnce([true]);
            const result = await isJobVerified('job-123');
            expect(result).toBe(true);
        });

        it('should return false when job is not verified', async () => {
            mockQuery.mockResolvedValueOnce([false]);
            const result = await isJobVerified('job-123');
            expect(result).toBe(false);
        });

        it('should return false on error', async () => {
            mockQuery.mockRejectedValueOnce(new Error('oops'));
            const result = await isJobVerified('job-123');
            expect(result).toBe(false);
        });

        it('should pass correct arguments', async () => {
            mockQuery.mockResolvedValueOnce([false]);
            await isJobVerified('abc');

            expect(mockQuery).toHaveBeenCalledWith(
                expect.objectContaining({
                    function: 'is_job_verified',
                    arguments: [Buffer.from('abc')],
                }),
            );
        });
    });

    describe('getJobData', () => {
        it('should return job data when found', async () => {
            const mockJob = {
                status: 'New',
                proof: new Uint8Array(),
                creation_timestamp: 1000n,
                agent_nonce: 1n,
            };
            mockQuery.mockResolvedValueOnce([mockJob]);

            const job = await getJobData('job-123');
            expect(job).not.toBeNull();
            expect(job!.status).toBe('New');
        });

        it('should return null when job not found', async () => {
            mockQuery.mockResolvedValueOnce([null]);
            const job = await getJobData('nonexistent');
            expect(job).toBeNull();
        });

        it('should return null on error', async () => {
            mockQuery.mockRejectedValueOnce(new Error('network'));
            const job = await getJobData('job-123');
            expect(job).toBeNull();
        });
    });
});
