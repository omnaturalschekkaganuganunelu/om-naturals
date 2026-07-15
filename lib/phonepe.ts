// lib/phonepe.ts
// Singleton PhonePe SDK v2 client — initialized once per process.
// Uses the new @phonepe-pg/pg-sdk-node package (v2).

import { StandardCheckoutClient, Env } from '@phonepe-pg/pg-sdk-node';

let _client: StandardCheckoutClient | null = null;

export function getPhonePeClient(): StandardCheckoutClient {
  if (_client) return _client;

  const clientId = process.env.PHONEPE_CLIENT_ID;
  const clientSecret = process.env.PHONEPE_CLIENT_SECRET;
  const clientVersionStr = process.env.PHONEPE_CLIENT_VERSION;
  const envStr = process.env.PHONEPE_ENV;

  if (!clientId || !clientSecret) {
    throw new Error(
      'Missing PhonePe configuration. Please ensure PHONEPE_CLIENT_ID and PHONEPE_CLIENT_SECRET are set in your environment variables.'
    );
  }

  const clientVersion = Number(clientVersionStr || '1');
  // Default to Env.PRODUCTION if running on the live domain to avoid sandbox redirection issues
  const isLiveSite = process.env.NEXT_PUBLIC_APP_URL?.includes('om-naturals.com');
  const env = (envStr === 'PRODUCTION' || isLiveSite) ? Env.PRODUCTION : Env.SANDBOX;

  _client = StandardCheckoutClient.getInstance(
    clientId,
    clientSecret,
    clientVersion,
    env,
  );

  return _client;
}