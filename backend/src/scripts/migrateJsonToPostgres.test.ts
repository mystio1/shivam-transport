import { describe, it, expect } from 'vitest';
import { buildMigrationPlan, type LegacyDb } from './migrateJsonToPostgres.js';

function fixture(): LegacyDb {
  return {
    groups: [{ code: 'ABC123', name: 'Test Transport', createdAt: '2025-01-01T00:00:00.000Z' }],
    users: [
      { id: 'user-1', groupCode: 'ABC123', role: 'admin', name: 'Admin One', phone: '9000000001', passwordHash: 'salt:hash' },
      { id: 'user-2', groupCode: 'GHOST', role: 'driver', name: 'Orphan Driver', phone: '9000000002', passwordHash: 'salt:hash' },
    ],
    customers: [
      {
        id: 'customer-1', groupCode: 'ABC123', name: 'Acme Co', advanceBalance: 500,
        advanceHistory: [{ id: 'adv-1', amount: 500, date: '2025-01-02T00:00:00.000Z' }],
      },
    ],
    trips: [
      {
        id: 'trip-1', groupCode: 'ABC123', customerId: 'customer-1', driverId: 'user-1',
        amount: 1000, submittedAt: '2025-01-03T00:00:00.000Z',
      },
      {
        // References a customer that doesn't exist in this dataset — must be nulled, not dropped.
        id: 'trip-2', groupCode: 'ABC123', customerId: 'customer-does-not-exist', driverId: 'user-1',
        amount: 2000, submittedAt: '2025-01-04T00:00:00.000Z',
      },
    ],
    bills: [
      {
        id: 'bill-1', groupCode: 'ABC123', customerId: 'customer-1', billNo: 'INV-001',
        trips: [
          { tripId: 'trip-1', amount: 1000, paidAmount: 1000 },
          { tripId: 'trip-does-not-exist', amount: 50, paidAmount: 0 },
        ],
      },
    ],
    auditLogs: [
      { id: 'audit-1', groupCode: 'ABC123', userId: 'user-1', userName: 'Admin One', action: 'trip.create.approved', entityId: 'trip-1' },
    ],
  };
}

describe('buildMigrationPlan', () => {
  it('maps a group code to a deterministic, stable group id', () => {
    const plan = buildMigrationPlan(fixture());
    expect(plan.groups).toHaveLength(1);
    expect(plan.groups[0]).toMatchObject({ code: 'ABC123', name: 'Test Transport' });
  });

  it('drops a user whose group no longer exists, with a warning', () => {
    const plan = buildMigrationPlan(fixture());
    expect(plan.users).toHaveLength(1);
    expect(plan.users[0]).toMatchObject({ id: 'user-1' });
    expect(plan.warnings.some((w) => w.includes('user-2') && w.includes('GHOST'))).toBe(true);
  });

  it('carries over a customer advance entry with its balance', () => {
    const plan = buildMigrationPlan(fixture());
    expect(plan.customers[0]).toMatchObject({ id: 'customer-1', advanceBalance: 500 });
    expect(plan.advanceEntries).toHaveLength(1);
    expect(plan.advanceEntries[0]).toMatchObject({ id: 'adv-1', customerId: 'customer-1', amount: 500 });
  });

  it('nulls out a trip customerId that does not resolve, with a warning, instead of dropping the trip', () => {
    const plan = buildMigrationPlan(fixture());
    const trip2 = plan.trips.find((t) => t.id === 'trip-2');
    expect(trip2).toMatchObject({ customerId: null });
    expect(plan.warnings.some((w) => w.includes('trip-2') && w.includes('customer-does-not-exist'))).toBe(true);
  });

  it('resolves a valid trip customerId and driverId', () => {
    const plan = buildMigrationPlan(fixture());
    const trip1 = plan.trips.find((t) => t.id === 'trip-1');
    expect(trip1).toMatchObject({ customerId: 'customer-1', driverId: 'user-1' });
  });

  it('nulls a bill trip line whose tripId does not resolve, keeps one that does', () => {
    const plan = buildMigrationPlan(fixture());
    expect(plan.billTripLines).toHaveLength(2);
    const [valid, dangling] = plan.billTripLines;
    expect(valid.tripId).toBe('trip-1');
    expect(dangling.tripId).toBeNull();
  });

  it('carries audit log entries for groups that migrated', () => {
    const plan = buildMigrationPlan(fixture());
    expect(plan.auditLogs).toHaveLength(1);
    expect(plan.auditLogs[0]).toMatchObject({ action: 'trip.create.approved', entityId: 'trip-1' });
  });
});
