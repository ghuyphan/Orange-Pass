import pb from "@/services/pocketBase";
import { openDatabase } from "../userDB"; // Assuming userDB handles DB connection
import QRRecord from "@/types/qrType";
import ServerRecord from "@/types/serverDataTypes";
import { returnItems } from "@/utils/returnItemData";

const ITEMS_PER_PAGE = 50;
const GUEST_USER_ID = ""; // Represents a guest user

/**
 * Create the QR table and its indexes within one transaction.
 * IMPORTANT: The FOREIGN KEY (user_id) REFERENCES users(id) constraint
 * means that if you strictly enforce foreign keys (e.g., with PRAGMA foreign_keys = ON),
 * you must have a user record in the 'users' table with id = GUEST_USER_ID (i.e., id = "")
 * for guest QR codes to be inserted. Alternatively, consider removing this constraint
 * if it complicates guest data management and isn't strictly needed for guests.
 * SQLite by default does NOT enforce foreign keys unless explicitly enabled.
 */
export async function createQrTable() {
  const db = await openDatabase();
  try {
    await db.runAsync("BEGIN TRANSACTION");

    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS qrcodes (
        id TEXT PRIMARY KEY NOT NULL,
        qr_index INTEGER NOT NULL,
        user_id TEXT NOT NULL, -- Empty string for guest user_id
        code TEXT NOT NULL,
        metadata TEXT NOT NULL,
        metadata_type TEXT NOT NULL,
        account_name TEXT,
        account_number TEXT,
        type TEXT NOT NULL,
        created TEXT NOT NULL,
        updated TEXT NOT NULL,
        is_deleted BOOLEAN NOT NULL,
        is_synced BOOLEAN NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );
    `);

    await db.execAsync(
      "CREATE INDEX IF NOT EXISTS idx_qr_user_id ON qrcodes(user_id);"
    );
    await db.execAsync(
      "CREATE INDEX IF NOT EXISTS idx_qr_is_deleted ON qrcodes(is_deleted);"
    );
    await db.execAsync(
      "CREATE INDEX IF NOT EXISTS idx_qr_index ON qrcodes(qr_index);"
    );

    await db.runAsync("COMMIT");
    console.log("[qrDB] qrcodes table created/verified successfully.");
  } catch (error) {
    await db.runAsync("ROLLBACK");
    console.error("[qrDB] Error creating qr table or indexes:", error);
  }
}

/**
 * Retrieve a QR code by ID for a specific user (or guest).
 */
export async function getQrCodeById(id: string, userId: string) {
  const db = await openDatabase();
  try {
    return await db.getFirstAsync<QRRecord>(
      "SELECT * FROM qrcodes WHERE id = ? AND user_id = ? AND is_deleted = 0",
      [id, userId]
    );
  } catch (error) {
    console.error(
      `[qrDB] Error retrieving QR code by ID ${id} for user ${userId}:`,
      error
    );
    return null;
  }
}

/**
 * Retrieve QR codes by user ID (or guest).
 */
export async function getQrCodesByUserId(userId: string) {
  const db = await openDatabase();
  try {
    // console.log(`[qrDB] Getting QR codes for user ID: '${userId}'`);
    const data = await db.getAllAsync<QRRecord>(
      "SELECT * FROM qrcodes WHERE user_id = ? AND is_deleted = 0 ORDER BY qr_index",
      userId
    );
    // console.log(`[qrDB] Found ${data.length} codes for user ID: '${userId}'`);
    return data;
  } catch (error) {
    console.error(
      `[qrDB] Error retrieving QR codes by user ID ${userId}:`,
      error
    );
    return [];
  }
}

/**
 * Check if any local data exists for the given user (or guest).
 */
export async function hasLocalData(userId: string): Promise<boolean> {
  const db = await openDatabase();
  try {
    const result = await db.getFirstAsync<{ count: number }>(
      "SELECT COUNT(*) as count FROM qrcodes WHERE user_id = ? AND is_deleted = 0",
      userId
    );
    return (result?.count ?? 0) > 0;
  } catch (error) {
    console.error(`[qrDB] Error checking for local data for user ${userId}:`, error);
    return false;
  }
}

/**
 * Soft-delete a QR code for a specific user (or guest).
 * For guests, is_synced remains true. For logged-in users, is_synced becomes 0.
 */
export async function deleteQrCode(id: string, userId: string) {
  const db = await openDatabase();
  try {
    const updatedAt = new Date().toISOString();
    const isSyncedValue = userId === GUEST_USER_ID ? 1 : 0; // Guests are "synced" locally, users need server sync
    await db.runAsync(
      `
      UPDATE qrcodes
      SET is_deleted = 1, updated = ?, is_synced = ?
      WHERE id = ? AND user_id = ?
    `,
      [updatedAt, isSyncedValue, id, userId]
    );
    console.log(`[qrDB] Soft-deleted QR code ${id} for user ${userId}.`);
  } catch (error) {
    console.error(`[qrDB] Failed to soft-delete QR code ${id} for user ${userId}:`, error);
    throw error;
  }
}

/**
 * Bulk insert QR codes using transactions. Allows GUEST_USER_ID.
 * Assumes incoming qrData.is_synced is set correctly (true for new guest items, false for new user items).
 */
export async function insertQrCodesBulk(
  qrDataArray: QRRecord[]
): Promise<void> {
  if (!qrDataArray.length) return;
  const db = await openDatabase();

  const placeholders = qrDataArray
    .map(() => "(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)")
    .join(", ");
  const values: any[] = [];
  qrDataArray.forEach(qrData => {
    values.push(
      qrData.id,
      qrData.qr_index,
      qrData.user_id, // Can be GUEST_USER_ID
      qrData.code,
      qrData.metadata,
      qrData.metadata_type,
      qrData.account_name || "",
      qrData.account_number || "",
      qrData.type,
      qrData.created,
      qrData.updated,
      qrData.is_deleted ? 1 : 0,
      qrData.is_synced ? 1 : 0 // Honor incoming is_synced status
    );
  });

  try {
    await db.runAsync("BEGIN TRANSACTION");
    await db.runAsync(
      `INSERT OR IGNORE INTO qrcodes
      (id, qr_index, user_id, code, metadata, metadata_type, account_name, account_number, type, created, updated, is_deleted, is_synced)
      VALUES ${placeholders}`,
      values
    );
    await db.runAsync("COMMIT");
    console.log(`[qrDB] Bulk inserted ${qrDataArray.length} QR codes.`);
  } catch (error) {
    await db.runAsync("ROLLBACK");
    console.error("[qrDB] Failed to insert bulk QR codes:", error);
  }
}

/**
 * Return the unsynced QR codes for a user.
 * Returns empty array for guests (as they don't sync with a server).
 */
export async function getUnsyncedQrCodes(userId: string) {
  if (userId === GUEST_USER_ID) {
    return [];
  }
  const db = await openDatabase();
  try {
    return await db.getAllAsync<QRRecord>(
      "SELECT * FROM qrcodes WHERE is_synced = 0 AND user_id = ? AND is_deleted = 0",
      userId
    );
  } catch (error) {
    console.error("[qrDB] Error retrieving unsynced QR codes:", error);
    return [];
  }
}

/**
 * Retrieve locally deleted QR codes that need server syncing.
 * Returns empty array for guests.
 */
export async function getLocallyDeletedQrCodes(userId: string) {
  if (userId === GUEST_USER_ID) {
    return [];
  }
  const db = await openDatabase();
  try {
    return await db.getAllAsync<QRRecord>(
      "SELECT * FROM qrcodes WHERE user_id = ? AND is_deleted = 1 AND is_synced = 0",
      userId
    );
  } catch (error) {
    console.error("[qrDB] Error retrieving locally deleted QR codes:", error);
    return [];
  }
}

/**
 * Synchronize local QR code changes with your server for a specific user.
 * No-op for guests.
 */
export async function syncQrCodes(userId: string) {
  if (userId === GUEST_USER_ID || !userId) {
    // console.log("[qrDB] Sync skipped for guest or invalid user ID.");
    return;
  }
  // ... (rest of syncQrCodes logic remains the same as it's for logged-in users)
  const db = await openDatabase();
  try {
    const unsyncedChanges = await getUnsyncedQrCodes(userId);
    const locallyDeleted = await getLocallyDeletedQrCodes(userId);
    const allUnsyncedItems = [...unsyncedChanges, ...locallyDeleted];

    if (allUnsyncedItems.length === 0) {
      // console.log("[qrDB] No items to sync for user:", userId);
      return;
    }

    const itemsToDeleteOnServer = locallyDeleted.filter(qr => qr.id);
    if (itemsToDeleteOnServer.length > 0) {
      await Promise.all(
        itemsToDeleteOnServer.map(qr => pb.collection("qr").delete(qr.id))
      );
    }

    const itemsToUpsertOnServer = unsyncedChanges;
    const filterExpression = itemsToUpsertOnServer
      .map(qr => `id='${qr.id}'`)
      .join(" || ");
    let serverRecords: ServerRecord[] = [];
    if (filterExpression) {
      serverRecords = await pb.collection("qr").getFullList({
        filter: filterExpression,
        fields: "id,updated",
      });
    }
    const serverRecordMap = new Map(
      serverRecords.map(rec => [rec.id, rec.updated])
    );

    const recordsToCreate: QRRecord[] = [];
    const recordsToUpdate: { id: string; data: Partial<QRRecord> }[] = [];

    for (const qrCode of itemsToUpsertOnServer) {
      const serverUpdated = serverRecordMap.get(qrCode.id);
      const { id, ...dataToSync } = qrCode;
      if (serverUpdated) {
        if (new Date(qrCode.updated) > new Date(serverUpdated)) {
          recordsToUpdate.push({ id: qrCode.id, data: dataToSync });
        }
      } else {
        recordsToCreate.push(qrCode);
      }
    }

    if (recordsToCreate.length > 0) {
      await Promise.all(
        recordsToCreate.map(record => pb.collection("qr").create(record))
      );
    }
    if (recordsToUpdate.length > 0) {
      await Promise.all(
        recordsToUpdate.map(({ id, data }) =>
          pb.collection("qr").update(id, data)
        )
      );
    }

    const idsToMarkSynced = allUnsyncedItems.map(qr => qr.id).filter(id => id);
    if (idsToMarkSynced.length > 0) {
      const placeholders = idsToMarkSynced.map(() => "?").join(",");
      await db.runAsync(
        `UPDATE qrcodes SET is_synced = 1, updated = ? WHERE id IN (${placeholders}) AND user_id = ?`,
        [new Date().toISOString(), ...idsToMarkSynced, userId]
      );
    }
    // console.log("[qrDB] Sync completed for user:", userId);
  } catch (error) {
    console.error("[qrDB] Error during sync:", error);
    throw error;
  }
}

/**
 * Fetch new/updated server data for a specific user.
 * No-op for guests.
 */
export async function fetchServerData(userId: string): Promise<QRRecord[]> {
  if (userId === GUEST_USER_ID || !userId) {
    return [];
  }
  // ... (rest of fetchServerData logic remains the same, including the account_name/number fix)
  try {
    const db = await openDatabase();
    const latestLocalUpdateResult = await db.getFirstAsync<{ updated: string }>(
      "SELECT MAX(updated) as updated FROM qrcodes WHERE user_id = ? AND is_synced = 1",
      userId
    );
    const latestLocalUpdate = latestLocalUpdateResult?.updated || null;

    let filter = `user_id = '${userId}'`;
    if (latestLocalUpdate) {
      const formattedTimestamp = new Date(latestLocalUpdate)
        .toISOString()
        .replace("T", " ")
        .substring(0, 19);
      filter += ` && updated > '${formattedTimestamp}'`;
    }

    let allServerItems: ServerRecord[] = [];
    let currentPage = 1;
    let totalPages = 1;

    do {
      const serverDataPage = await pb
        .collection("qr")
        .getList<ServerRecord>(currentPage, ITEMS_PER_PAGE, {
          filter,
          sort: "updated",
        });

      if (serverDataPage.items && serverDataPage.items.length > 0) {
        allServerItems = allServerItems.concat(serverDataPage.items);
      }
      totalPages = serverDataPage.totalPages;
      currentPage++;
    } while (currentPage <= totalPages);

    return allServerItems.map((item): QRRecord => {
      if (
        !item.id ||
        item.qr_index === undefined ||
        !item.user_id ||
        !item.code ||
        !item.metadata ||
        !item.metadata_type ||
        !item.type ||
        !item.created ||
        !item.updated ||
        item.is_deleted === undefined
      ) {
        console.warn("[qrDB] Invalid server data format for item:", item);
        throw new Error(
          `Invalid server data format: Missing required properties for item ID ${item.id}`
        );
      }
      return {
        id: item.id,
        qr_index: item.qr_index,
        user_id: item.user_id,
        code: item.code,
        metadata: item.metadata,
        metadata_type: item.metadata_type as "qr" | "barcode",
        account_name: item.account_name || "",
        account_number: item.account_number || "",
        type: item.type as "bank" | "store" | "ewallet",
        created: item.created,
        updated: item.updated,
        is_deleted: item.is_deleted,
        is_synced: true,
      };
    });
  } catch (error) {
    console.error("[qrDB] Error fetching or validating server data:", error);
    throw error;
  }
}

/**
 * Insert or update QR codes in the local database. Allows GUEST_USER_ID.
 * Honors incoming is_synced status.
 */
export async function insertOrUpdateQrCodes(
  qrDataArray: QRRecord[]
): Promise<void> {
  if (!qrDataArray.length) return;
  const db = await openDatabase();

  try {
    await db.runAsync("BEGIN TRANSACTION");

    const placeholders = qrDataArray.map(() => "?").join(",");
    const existingRecords = await db.getAllAsync<{
      id: string;
      updated: string;
      user_id: string; // Fetch user_id to handle potential guest-to-user transfer updates
    }>(
      `SELECT id, updated, user_id FROM qrcodes WHERE id IN (${placeholders})`,
      ...qrDataArray.map(qr => qr.id)
    );
    const existingRecordMap = new Map(
      existingRecords.map(rec => [rec.id, { updated: rec.updated, userId: rec.user_id }])
    );

    const recordsToInsert: QRRecord[] = [];
    const recordsToUpdate: QRRecord[] = [];

    for (const qrData of qrDataArray) {
      const existingRecordInfo = existingRecordMap.get(qrData.id);
      if (existingRecordInfo) {
        // Record exists, update if incoming data is newer OR if user_id is changing
        // (e.g., guest data being assigned to a real user after migration)
        if (
          new Date(qrData.updated) > new Date(existingRecordInfo.updated) ||
          qrData.user_id !== existingRecordInfo.userId // Important for guest-to-user migration
        ) {
          recordsToUpdate.push(qrData);
        }
      } else {
        recordsToInsert.push(qrData);
      }
    }

    if (recordsToInsert.length > 0) {
      const insertPlaceholders = recordsToInsert
        .map(() => "(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)")
        .join(", ");
      const insertValues: any[] = recordsToInsert.flatMap(qrData => [
        qrData.id,
        qrData.qr_index,
        qrData.user_id,
        qrData.code,
        qrData.metadata,
        qrData.metadata_type,
        qrData.account_name || "",
        qrData.account_number || "",
        qrData.type,
        qrData.created,
        qrData.updated,
        qrData.is_deleted ? 1 : 0,
        qrData.is_synced ? 1 : 0, // Honor incoming is_synced
      ]);
      await db.runAsync(
        `INSERT INTO qrcodes
        (id, qr_index, user_id, code, metadata, metadata_type, account_name,
         account_number, type, created, updated, is_deleted, is_synced)
         VALUES ${insertPlaceholders}`,
        insertValues
      );
    }

    for (const qrData of recordsToUpdate) {
      await db.runAsync(
        `UPDATE qrcodes
         SET qr_index = ?, user_id = ?, code = ?, metadata = ?, metadata_type = ?,
         account_name = ?, account_number = ?, type = ?, updated = ?,
         is_deleted = ?, is_synced = ?
         WHERE id = ?`,
        [
          qrData.qr_index,
          qrData.user_id, // This allows changing user_id
          qrData.code,
          qrData.metadata,
          qrData.metadata_type,
          qrData.account_name || "",
          qrData.account_number || "",
          qrData.type,
          qrData.updated,
          qrData.is_deleted ? 1 : 0,
          qrData.is_synced ? 1 : 0, // Honor incoming is_synced
          qrData.id,
        ]
      );
    }
    await db.runAsync("COMMIT");
    // console.log(`[qrDB] Inserted ${recordsToInsert.length}, Updated ${recordsToUpdate.length} QR codes.`);
  } catch (error) {
    await db.runAsync("ROLLBACK");
    console.error("[qrDB] Failed to insert/update QR codes:", error);
  }
}

/**
 * Search QR codes for a specific user (or guest).
 */
export async function searchQrCodes(userId: string, searchQuery: string = "") {
  const db = await openDatabase();
  try {
    const queryParams: any[] = [userId];
    const conditions: string[] = ["user_id = ? AND is_deleted = 0"];
    if (searchQuery) {
      const matchingCodes = returnItems(searchQuery);
      const searchTerms = Array.from(new Set([searchQuery, ...matchingCodes]));
      const searchConditions = searchTerms.flatMap(term =>
        ["code", "metadata", "account_name", "account_number", "type"].map(
          field => {
            queryParams.push(`%${term}%`);
            return `${field} LIKE ?`;
          }
        )
      );
      conditions.push(`(${searchConditions.join(" OR ")})`);
    }

    const query = `
      SELECT * FROM qrcodes
      WHERE ${conditions.join(" AND ")}
      ORDER BY qr_index
    `;
    return await db.getAllAsync<QRRecord>(query, ...queryParams);
  } catch (error) {
    console.error(`[qrDB] Error searching QR codes for user ${userId}:`, error);
    return [];
  }
}

/**
 * Filter QR codes by type for a specific user (or guest).
 */
export async function filterQrCodesByType(
  userId: string,
  filter: string = "all"
) {
  const db = await openDatabase();
  try {
    const queryParams: any[] = [userId];
    const conditions: string[] = ["user_id = ? AND is_deleted = 0"];
    if (filter !== "all") {
      conditions.push("type = ?");
      queryParams.push(filter);
    }
    const query = `
      SELECT * FROM qrcodes
      WHERE ${conditions.join(" AND ")}
      ORDER BY qr_index
    `;
    return await db.getAllAsync<QRRecord>(query, ...queryParams);
  } catch (error) {
    console.error(`[qrDB] Error filtering QR codes by type for user ${userId}:`, error);
    return [];
  }
}

/**
 * Update the qr_index values and the updated timestamp for an array of QR codes for a specific user (or guest).
 */
export async function updateQrIndexes(
  qrDataArray: QRRecord[],
  userId: string
): Promise<void> {
  if (!qrDataArray.length) return;

  const validQrData = qrDataArray.filter(qr => qr.user_id === userId);
  if (!validQrData.length) {
    // console.warn("[qrDB] updateQrIndexes: No valid QR data for the given user ID to update.", {userId, count: qrDataArray.length});
    return;
  }

  const db = await openDatabase();
  const updatedAt = new Date().toISOString();
  // For guests, is_synced remains true. For logged-in users, it becomes 0.
  const isSyncedValue = userId === GUEST_USER_ID ? 1 : 0;

  try {
    await db.runAsync("BEGIN TRANSACTION");
    for (const qr of validQrData) {
      await db.runAsync(
        `UPDATE qrcodes
         SET qr_index = ?, updated = ?, is_synced = ?
         WHERE id = ? AND user_id = ?`,
        [qr.qr_index, updatedAt, isSyncedValue, qr.id, userId]
      );
    }
    await db.runAsync("COMMIT");
    // console.log(`[qrDB] Updated QR indexes for ${validQrData.length} items for user ${userId}.`);
  } catch (error) {
    await db.runAsync("ROLLBACK");
    console.error(`[qrDB] Failed to update QR indexes for user ${userId}:`, error);
  }
}

/**
 * Get the next available QR index for a user (or guest).
 */
export async function getNextQrIndex(userId: string): Promise<number> {
  const db = await openDatabase();
  try {
    const result = await db.getFirstAsync<{ maxIndex: number | null }>(
      "SELECT MAX(qr_index) as maxIndex FROM qrcodes WHERE user_id = ? AND is_deleted = 0",
      userId // Works for GUEST_USER_ID = ""
    );
    return (result?.maxIndex ?? -1) + 1;
  } catch (error) {
    console.error(`[qrDB] Error getting next QR index for user ${userId}:`, error);
    return 0;
  }
}

/**
 * Transfers QR codes from the guest account (GUEST_USER_ID) in the local DB
 * to a newly logged-in user.
 * Updates user_id, re-calculates qr_index, and marks for server sync.
 */
export async function transferGuestDataToUser(newUserId: string): Promise<void> {
  if (!newUserId || newUserId === GUEST_USER_ID) {
    console.warn("[qrDB] transferGuestDataToUser: Invalid newUserId provided.");
    return;
  }

  const db = await openDatabase();
  try {
    await db.runAsync("BEGIN TRANSACTION");

    const guestQrRecords = await db.getAllAsync<QRRecord>(
      "SELECT * FROM qrcodes WHERE user_id = ? AND is_deleted = 0 ORDER BY qr_index",
      GUEST_USER_ID
    );

    if (!guestQrRecords.length) {
      // console.log("[qrDB] No guest data to migrate.");
      await db.runAsync("COMMIT"); // Commit even if no data
      return;
    }

    const nextUserStartIndex = await getNextQrIndex(newUserId);
    const now = new Date().toISOString();

    for (let i = 0; i < guestQrRecords.length; i++) {
      const guestRecord = guestQrRecords[i];
      const newQrIndex = nextUserStartIndex + i;

      await db.runAsync(
        `UPDATE qrcodes
         SET user_id = ?, qr_index = ?, is_synced = 0, updated = ?
         WHERE id = ? AND user_id = ?`, // Ensure we only update the guest's record
        [newUserId, newQrIndex, now, guestRecord.id, GUEST_USER_ID]
      );
    }

    await db.runAsync("COMMIT");
    console.log(
      `[qrDB] Successfully migrated ${guestQrRecords.length} guest QR records to user ${newUserId}`
    );
  } catch (error) {
    await db.runAsync("ROLLBACK");
    console.error(
      `[qrDB] Error migrating guest data to user ${newUserId}:`,
      error
    );
    throw error;
  }
}

/**
 * Close the database connection.
 */
export async function closeDatabase() {
  const db = await openDatabase();
  try {
    await db.closeAsync();
  } catch (error) {
    console.error("[qrDB] Error closing the database:", error);
  }
}
