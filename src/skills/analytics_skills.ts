import axios from 'axios';
import {Logger} from '../utils/logger';

const logger = new Logger('AnalyticsSkills');
const ELASTIC_URL = 'https://api.multiversx.com/elastic';

export async function getAgentRevenue(
  address: string,
  daysBack: number = 30,
): Promise<number> {
  logger.info(`Fetching revenue for ${address} over ${daysBack} days`);
  const timestampGte = Math.floor(Date.now() / 1000) - daysBack * 86400;

  const query = {
    query: {
      bool: {
        must: [
          {match: {receiver: address}},
          {match: {function: 'settle'}}, // Assuming the logic
          {range: {timestamp: {gte: timestampGte}}},
        ],
      },
    },
    size: 1000,
  };

  try {
    const response = await axios.post(
      `${ELASTIC_URL}/transactions/_search`,
      query,
    );
    const hits = response.data?.hits?.hits || [];

    let total = 0n;
    for (const hit of hits) {
      total += BigInt(hit._source.value || '0');
    }

    // Convert from EGLD (10^18) to float
    return Number(total) / 1e18;
  } catch {
    logger.error('Failed to parse analytics revenue');
    return 0;
  }
}

export async function getAgentSpend(
  address: string,
  daysBack: number = 30,
): Promise<number> {
  logger.info(`Fetching spend for ${address} over ${daysBack} days`);
  const timestampGte = Math.floor(Date.now() / 1000) - daysBack * 86400;

  const query = {
    query: {
      bool: {
        must: [
          {match: {sender: address}},
          {match: {function: 'open_session'}},
          {range: {timestamp: {gte: timestampGte}}},
        ],
      },
    },
    size: 1000,
  };

  try {
    const response = await axios.post(
      `${ELASTIC_URL}/transactions/_search`,
      query,
    );
    const hits = response.data?.hits?.hits || [];

    let total = 0n;
    for (const hit of hits) {
      // Spend includes native transfers mapped to the session opening
      total += BigInt(hit._source.value || '0');
    }

    return Number(total) / 1e18;
  } catch {
    logger.error('Failed to parse analytics spend');
    return 0;
  }
}
