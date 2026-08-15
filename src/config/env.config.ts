export interface AppConfig {
  nodeEnv: 'development' | 'production' | 'test';
  port: number;
  appBaseUrl: string;
  databaseUrl: string;
  clickhouse: {
    host: string;
    user: string;
    password?: string;
    database: string;
  };
  redisUrl: string;
  encryptionKey: string;
  stripe: {
    secretKey: string;
    webhookSecret?: string;
  };
  shopify: {
    apiKey: string;
    apiSecret: string;
  };
  klaviyo: {
    clientId: string;
    clientSecret: string;
  };
}

export function loadConfig(): AppConfig {
  return {
    nodeEnv: (process.env.NODE_ENV as any) || 'development',
    port: parseInt(process.env.PORT || '4000', 10),
    appBaseUrl: process.env.APP_BASE_URL || 'http://localhost:4000',
    databaseUrl: process.env.DATABASE_URL || 'postgresql://postgres:postgrespassword@localhost:5432/pulse_db',
    clickhouse: {
      host: process.env.CLICKHOUSE_HOST || 'http://localhost:8123',
      user: process.env.CLICKHOUSE_USER || 'default',
      password: process.env.CLICKHOUSE_PASSWORD || '',
      database: process.env.CLICKHOUSE_DB || 'pulse_analytics'
    },
    redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
    encryptionKey: process.env.ENCRYPTION_KEY || '0123456789abcdef0123456789abcdef',
    stripe: {
      secretKey: process.env.STRIPE_SECRET_KEY || 'sk_test_mock',
      webhookSecret: process.env.STRIPE_WEBHOOK_SECRET
    },
    shopify: {
      apiKey: process.env.SHOPIFY_API_KEY || 'mock_shopify_key',
      apiSecret: process.env.SHOPIFY_API_SECRET || 'mock_shopify_secret'
    },
    klaviyo: {
      clientId: process.env.KLAVIYO_CLIENT_ID || 'mock_klaviyo_client_id',
      clientSecret: process.env.KLAVIYO_CLIENT_SECRET || 'mock_klaviyo_client_secret'
    }
  };
}
