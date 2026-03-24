import axios from 'axios';
import {CONFIG} from '../config';
import {Logger} from '../utils/logger';

const logger = new Logger('NetworkSkills');

export interface NetworkConfig {
  erd_chain_id: string;
  erd_round_duration: number;
}

export interface TransactionStatus {
  hash: string;
  status: string;
}

export async function getNetworkConfig(): Promise<NetworkConfig | null> {
  try {
    const response = await axios.get(`${CONFIG.API_URL}/network/config`);
    return response.data?.data?.config as NetworkConfig;
  } catch {
    logger.error('Failed to fetch network config');
    return null;
  }
}

export async function getTransactionStatus(
  txHash: string,
): Promise<TransactionStatus | null> {
  try {
    const response = await axios.get(
      `${CONFIG.API_URL}/transactions/${txHash}?fields=status`,
    );
    return {
      hash: txHash,
      status: response.data?.status || 'unknown',
    };
  } catch {
    return null;
  }
}
