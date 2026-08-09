import { prisma, type DbClient } from '../prisma.js';
import { DEFAULT_BRANDING, sanitizeBankAccounts, type Branding, type BankAccount } from '../../services/branding.js';

const EDITABLE_FIELDS = [
  'companyName', 'tagline', 'proprietorName', 'phone1', 'phone2', 'address',
  'gstNumber', 'footerNote', 'primaryColor', 'accentColor', 'logoDataUrl', 'signatureDataUrl',
  'headerLeftImageDataUrl', 'headerRightImageDataUrl', 'upiQrImageDataUrl', 'upiQrShowOn',
  'bankName', 'bankBranch', 'bankAccountNumber', 'bankIfsc', 'publicServerUrl',
] as const;

// Assembles the API-facing Branding shape from the Branding row + BankAccount rows + the
// invoice counter (which lives on Group, not Branding — see prisma/schema.prisma). Every Group
// is created with a Branding row (groups.repository.ts's create()), so this throws rather than
// silently falling back to defaults if one is ever missing — that would indicate a data bug.
export async function get(groupId: string, client: DbClient = prisma): Promise<Branding> {
  const group = await client.group.findUniqueOrThrow({
    where: { id: groupId },
    include: { branding: true, bankAccounts: { orderBy: { sortOrder: 'asc' } } },
  });
  if (!group.branding) throw new Error(`Group ${groupId} has no branding row`);
  const b = group.branding;
  return {
    companyName: b.companyName,
    tagline: b.tagline,
    proprietorName: b.proprietorName,
    phone1: b.phone1,
    phone2: b.phone2,
    address: b.address,
    gstNumber: b.gstNumber,
    footerNote: b.footerNote,
    primaryColor: b.primaryColor,
    accentColor: b.accentColor,
    logoDataUrl: b.logoDataUrl || '',
    signatureDataUrl: b.signatureDataUrl || '',
    headerLeftImageDataUrl: b.headerLeftImageDataUrl || '',
    headerRightImageDataUrl: b.headerRightImageDataUrl || '',
    upiQrImageDataUrl: b.upiQrImageDataUrl || '',
    upiQrShowOn: (b.upiQrShowOn as 'both' | 'gst' | 'non-gst') || 'both',
    bankName: b.bankName,
    bankBranch: b.bankBranch,
    bankAccountNumber: b.bankAccountNumber,
    bankIfsc: b.bankIfsc,
    bankAccounts: group.bankAccounts.map((a) => ({
      id: a.id, label: a.label, bankName: a.bankName, bankBranch: a.bankBranch,
      accountNumber: a.accountNumber, ifscCode: a.ifscCode,
    })),
    publicServerUrl: b.publicServerUrl,
    nextInvoiceNumber: group.nextInvoiceNumber,
  };
}

export async function update(
  groupId: string,
  patch: Record<string, unknown>,
  client: DbClient = prisma,
): Promise<Branding> {
  const data: Record<string, string> = {};
  for (const key of EDITABLE_FIELDS) {
    if (Object.prototype.hasOwnProperty.call(patch, key)) {
      data[key] = String(patch[key] ?? '').trim();
    }
  }
  await client.branding.update({ where: { groupId }, data });

  if (Object.prototype.hasOwnProperty.call(patch, 'bankAccounts')) {
    const accounts = sanitizeBankAccounts(patch.bankAccounts);
    // Replace-all — sanitizeBankAccounts already recomputes every id, so there's no meaningful
    // "existing row" to diff against; a delete+recreate inside the same transaction is simplest
    // and this table is never referenced by anything else (no FKs point at BankAccount.id).
    await client.bankAccount.deleteMany({ where: { groupId } });
    if (accounts.length) {
      await client.bankAccount.createMany({
        data: accounts.map((a: BankAccount, index: number) => ({
          groupId, label: a.label, bankName: a.bankName, bankBranch: a.bankBranch,
          accountNumber: a.accountNumber, ifscCode: a.ifscCode, sortOrder: index,
        })),
      });
    }
  }

  return get(groupId, client);
}

// Atomic at the DB level (`increment` compiles to a single `SET x = x + 1` statement, so two
// concurrent callers each get their own distinct post-increment value from Postgres's row lock —
// no read-then-write race). Returns the number the CALLER should use on their invoice; the
// row now holds the next one.
export async function consumeNextInvoiceNumber(groupId: string, client: DbClient = prisma): Promise<number> {
  const updated = await client.group.update({
    where: { id: groupId },
    data: { nextInvoiceNumber: { increment: 1 } },
    select: { nextInvoiceNumber: true },
  });
  return updated.nextInvoiceNumber - 1;
}

export { DEFAULT_BRANDING };
