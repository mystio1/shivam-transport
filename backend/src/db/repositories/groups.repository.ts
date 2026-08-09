import type { Group } from '@prisma/client';
import { prisma, type DbClient } from '../prisma.js';
import { DEFAULT_BRANDING } from '../../services/branding.js';

export function findByCode(code: string, client: DbClient = prisma): Promise<Group | null> {
  return client.group.findUnique({ where: { code } });
}

export function findById(id: string, client: DbClient = prisma): Promise<Group | null> {
  return client.group.findUnique({ where: { id } });
}

export function existsByCode(code: string, client: DbClient = prisma): Promise<boolean> {
  return client.group.count({ where: { code } }).then((count) => count > 0);
}

export function setFrozen(id: string, frozen: boolean, client: DbClient = prisma): Promise<Group> {
  return client.group.update({ where: { id }, data: { frozen } });
}

// `null` in any field means "unlimited" for that cap — an explicit clear, not "leave unchanged",
// so the support console's Manage dialog can always be a straightforward save-what's-in-the-form.
export function setLimits(
  id: string,
  limits: { maxDrivers: number | null; maxAdmins: number | null; maxBillsPerDay: number | null },
  client: DbClient = prisma,
): Promise<Group> {
  return client.group.update({ where: { id }, data: limits });
}

// Creates the Group and its 1:1 Branding row together — every Group is expected to have a
// Branding row from the moment it exists, so branding.repository.ts's `get()` never has to
// handle a missing row.
export function create(
  data: { code: string; name: string },
  client: DbClient = prisma,
): Promise<Group> {
  return client.group.create({
    data: {
      code: data.code,
      name: data.name,
      branding: {
        create: {
          companyName: DEFAULT_BRANDING.companyName,
          tagline: DEFAULT_BRANDING.tagline,
          footerNote: DEFAULT_BRANDING.footerNote,
          primaryColor: DEFAULT_BRANDING.primaryColor,
          accentColor: DEFAULT_BRANDING.accentColor,
        },
      },
    },
  });
}
