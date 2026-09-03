import 'dotenv/config';
import { z } from 'zod';

const schema = z.object({
  PORT: z.coerce.number().default(3001), NODE_ENV: z.enum(['development','test','production']).default('development'),
  FRONTEND_URL: z.string().default('http://localhost:5173'), JWT_SECRET: z.string().min(16).default('development-only-change-me'),
  INITIAL_ADMIN_USERNAME: z.string().default('rojasimpresiones'), INITIAL_ADMIN_PASSWORD_HASH: z.string().default(''),
  DATA_SOURCE: z.enum(['demo','xlsx','google_sheets']).default('demo'),
  EXCEL_FILE_PATH: z.string().optional(),
  BLOB_READ_WRITE_TOKEN: z.string().optional(),
  BLOB_STORE_ID: z.string().optional(),
  AI_ENABLED: z.string().default('false').transform(value=>value.toLowerCase()==='true'),
  OPENAI_API_KEY: z.string().optional(),
OPENAI_MODEL: z.string().default('gpt-5.6-luna'),
AI_MONTHLY_BUDGET_USD: z.coerce.number().positive().default(2)
});
export const env = schema.parse(process.env);
