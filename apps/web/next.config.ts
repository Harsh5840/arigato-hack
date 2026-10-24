import type { NextConfig } from 'next';
import { resolve } from 'node:path';
const config: NextConfig = {
  devIndicators: false,
  output: process.env.PROOFPATCH_STANDALONE === '1' ? 'standalone' : undefined,
  outputFileTracingRoot: resolve(__dirname, '../..'),
};
export default config;
