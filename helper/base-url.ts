import { ConfigLoader } from './ConfigLoader';

type BaseUrlConfig = {
  baseUrl?: string;
};

const config = ConfigLoader.loadConfig<BaseUrlConfig>('test-config.json');
const resolvedBaseUrl = process.env.BASE_URL ?? config.baseUrl;

if (!resolvedBaseUrl) {
  throw new Error('BASE_URL is not defined. Set BASE_URL env var or baseUrl in test-config.json');
}

export const BASE_URL = resolvedBaseUrl.replace(/\/+$/, '');