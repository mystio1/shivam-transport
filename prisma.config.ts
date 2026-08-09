import 'dotenv/config';
import { defineConfig, env } from 'prisma/config';

// Prisma 7 config — see prisma/schema.prisma's datasource block for why Supabase needs both a
// pooled and a direct connection string.
export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    url: env('DATABASE_URL'),
    directUrl: env('DIRECT_URL'),
  },
});
