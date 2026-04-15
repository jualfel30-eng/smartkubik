/**
 * SmartKubik offline-first database (Dexie / IndexedDB)
 *
 * Stores:
 *  - appointments  : cached beauty bookings keyed by _id
 *  - mutationQueue : pending API calls to replay on reconnect
 */
import Dexie from 'dexie';

const db = new Dexie('smartkubik');

db.version(1).stores({
  // appointments: _id is primary key; index on tenantId+date for fast day queries
  appointments: '_id, tenantId, date, status',
  // mutationQueue: auto-increment id; operations to replay when back online
  mutationQueue: '++id, tenantId, type, createdAt',
});

export default db;
