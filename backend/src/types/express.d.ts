import type { User } from '@prisma/client';

declare global {
  namespace Express {
    interface Request {
      // `groupCode` is denormalized onto req.auth at requireAuth time (one extra join, done
      // once per request) so route handlers never need a second query just to stamp the
      // legacy-shaped `groupCode` field the frontend expects onto their JSON responses.
      auth?: { user: User; groupId: string; groupCode: string; groupFrozen: boolean };
    }
  }
}

export {};
