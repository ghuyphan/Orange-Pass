import pb from "@/services/pocketBase";
import { openDatabase } from "../userDB"; // Assuming userDB handles DB connection
import QRRecord from "@/types/qrType";
import ServerRecord from "@/types/serverDataTypes"; // Assuming you have this type defined

import { returnItems } from "@/utils/returnItemData";

import { GUEST_USER_ID } from "@/constants/Constants";
const ITEMS_PER_PAGE = 50;

export async function createQrTable(): Promise<void> {
  const db = await openDatabase();
  try {
    await db.runAsync("BEGIN TRANSACTION;");

    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS qrcodes (
        id TEXT PRIMARY KEY NOT NULL,
        qr_index INTEGER NOT NULL,
        user_id TEXT NOT NULL,
        code TEXT NOT NULL,
        metadata TEXT NOT NULL,
        metadata_type TEXT NOT NULL,
        account_name TEXT,
        account_number TEXT,
        type TEXT NOT NULL,
        created TEXT NOT NULL,
        updated TEXT NOT NULL,
        is_deleted BOOLEAN NOT NULL DEFAULT 0,
        is_synced BOOLEAN NOT NULL DEFAULT 0,
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
      "CREATE INDEX IF NOT EXISTS idx_qr_is_synced ON qrcodes(is_synced);"
    );
    await db.execAsync(
      "CREATE INDEX IF NOT EXISTS idx_qr_index ON qrcodes(qr_index);"
    );

    await db.runAsync("COMMIT;");
  } catch (error) {
    await db.runAsync("ROLLBACK;");
    console.error("[qrDB] Error creating qr table or indexes:", error);
    throw error;
  }
}

export async function getQrCodeById(
  id: string,
  userId: string
): Promise<QRRecord | null> {
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

export async function getQrCodesByUserId(userId: string): Promise<QRRecord[]> {
  const db = await openDatabase();
  try {
    return await db.getAllAsync<QRRecord>(
      "SELECT * FROM qrcodes WHERE user_id = ? AND is_deleted = 0 ORDER BY qr_index ASC",
      userId
    );
  } catch (error) {
    console.error(
      `[qrDB] Error retrieving QR codes by user ID ${userId}:`,
      error
    );
    return [];
  }
}

export async function hasLocalData(userId: string): Promise<boolean> {
  const db = await openDatabase();
  try {
    const result = await db.getFirstAsync<{ count: number }>(
      "SELECT COUNT(*) as count FROM qrcodes WHERE user_id = ? AND is_deleted = 0",
      userId
    );
    return (result?.count ?? 0) > 0;
  } catch (error) {
    console.error(
      `[qrDB] Error checking for local data for user ${userId}:`,
      error
    );
    return false;
  }
}

export async function deleteQrCode(id: string, userId: string): Promise<void> {
  const db = await openDatabase();
  try {
    const updatedAt = new Date().toISOString();
    const isSyncedValue = userId === GUEST_USER_ID ? 1 : 0;
    await db.runAsync(
      `
      UPDATE qrcodes
      SET is_deleted = 1, updated = ?, is_synced = ?
      WHERE id = ? AND user_id = ?
    `,
      [updatedAt, isSyncedValue, id, userId]
    );
  } catch (error) {
    console.error(
      `[qrDB] Failed to soft-delete QR code ${id} for user ${userId}:`,
      error
    );
    throw error;
  }
}

export async function insertQrCodesBulk(
  qrDataArray: QRRecord[]
): Promise<void> {
  if (!qrDataArray || qrDataArray.length === 0) return;
  const db = await openDatabase();

  const placeholders = qrDataArray
    .map(() => "(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)")
    .join(", ");

  const values: any[] = qrDataArray.flatMap((qrData) => [
    qrData.id,
    qrData.qr_index,
    qrData.user_id,
    qrData.code,
    qrData.metadata,
    qrData.metadata_type,
    qrData.account_name || null,
    qrData.account_number || null,
    qrData.type,
    qrData.created,
    qrData.updated,
    qrData.is_deleted ? 1 : 0,
    qrData.is_synced ? 1 : 0,
  ]);

  try {
    await db.runAsync("BEGIN TRANSACTION;");
    await db.runAsync(
      `INSERT OR IGNORE INTO qrcodes
      (id, qr_index, user_id, code, metadata, metadata_type, account_name, account_number, type, created, updated, is_deleted, is_synced)
      VALUES ${placeholders}`,
      values
    );
    await db.runAsync("COMMIT;");
  } catch (error) {
    await db.runAsync("ROLLBACK;");
    console.error("[qrDB] Failed to insert bulk QR codes:", error);
    throw error;
  }
}

export async function getUnsyncedQrCodes(userId: string): Promise<QRRecord[]> {
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
    console.error(
      `[qrDB] Error retrieving unsynced QR codes for user ${userId}:`,
      error
    );
    return [];
  }
}

export async function getLocallyDeletedQrCodes(
  userId: string
): Promise<QRRecord[]> {
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
    console.error(
      `[qrDB] Error retrieving locally deleted QR codes for user ${userId}:`,
      error
    );
    return [];
  }
}

export async function syncQrCodes(userId: string): Promise<void> {
  if (userId === GUEST_USER_ID || !userId) {
    return;
  }
  const db = await openDatabase();

  try {
    const unsyncedChanges = await getUnsyncedQrCodes(userId);
    const locallyDeleted = await getLocallyDeletedQrCodes(userId);

    // --- Handle Deletions on Server ---
    if (locallyDeleted.length > 0) {
      const serverDeletionPromises = locallyDeleted.map((qr) =>
        pb
          .collection("qr")
          .update(qr.id, { is_deleted: true, updated: new Date().toISOString() })
      );
      const results = await Promise.allSettled(serverDeletionPromises);

      const successfullyDeletedServerIds: string[] = [];
      results.forEach((result, index) => {
        if (result.status === "fulfilled") {
          successfullyDeletedServerIds.push(locallyDeleted[index].id);
        } else {
          console.error(
            `[qrDB] syncQrCodes: Failed to mark qr ${locallyDeleted[index].id} as deleted on server:`,
            result.reason
          );
        }
      });

      if (successfullyDeletedServerIds.length > 0) {
        const placeholders = successfullyDeletedServerIds
          .map(() => "?")
          .join(",");
        await db.runAsync(
          `UPDATE qrcodes SET is_synced = 1, updated = ? WHERE id IN (${placeholders}) AND user_id = ?`,
          [new Date().toISOString(), ...successfullyDeletedServerIds, userId]
        );
      }
    }

    // --- Handle Creations/Updates on Server ---
    if (unsyncedChanges.length > 0) {
      const itemsToUpsertOnServer = unsyncedChanges;
      const localIdsForUpsert = itemsToUpsertOnServer.map((qr) => qr.id);
      let filterForExistingCheck = "";
      if (localIdsForUpsert.length > 0) {
        filterForExistingCheck = localIdsForUpsert
          .map((id) => `id = "${id}"`)
          .join(" || ");
      }

      let serverRecords: ServerRecord[] = [];
      if (filterForExistingCheck) {
        try {
          serverRecords = await pb.collection("qr").getFullList({
            filter: filterForExistingCheck,
            fields: "id,updated,is_deleted",
          });
        } catch (e: any) {
          console.warn(
            "[qrDB] syncQrCodes: Could not fetch server records for upsert check:",
            e.message
          );
        }
      }
      const serverRecordMap = new Map(
        serverRecords.map((rec) => [
          rec.id,
          { updated: rec.updated, is_deleted: rec.is_deleted },
        ])
      );

      const recordsToCreatePayloads: {
        localId: string;
        payload: Omit<QRRecord, "id">;
      }[] = [];
      const recordsToUpdatePayloads: {
        id: string;
        data: Partial<Omit<QRRecord, "id" | "is_synced">>;
      }[] = [];

      for (const qrCode of itemsToUpsertOnServer) {
        const { id: localId, is_synced, ...dataForServer } = qrCode;
        const serverInfo = serverRecordMap.get(localId);
        const payloadWithUser = { ...dataForServer, user_id: userId };

        if (serverInfo) {
          if (
            !serverInfo.is_deleted &&
            new Date(qrCode.updated) > new Date(serverInfo.updated)
          ) {
            recordsToUpdatePayloads.push({
              id: localId,
              data: payloadWithUser,
            });
          } else if (serverInfo.is_deleted) {
            if (new Date(qrCode.updated) > new Date(serverInfo.updated)) {
              recordsToUpdatePayloads.push({
                id: localId,
                data: { ...payloadWithUser, is_deleted: false },
              });
            }
          } else {
            await db.runAsync(
              `UPDATE qrcodes SET is_synced = 1, updated = ? WHERE id = ? AND user_id = ?`,
              [serverInfo.updated, localId, userId]
            );
          }
        } else {
          recordsToCreatePayloads.push({
            localId,
            payload: { ...payloadWithUser, is_deleted: false, is_synced: true },
          });
        }
      }

      // Perform Creations
      if (recordsToCreatePayloads.length > 0) {
        for (const itemToCreate of recordsToCreatePayloads) {
          try {
            const serverRecord = await pb
              .collection("qr")
              .create<ServerRecord>(itemToCreate.payload);

            await db.runAsync(
              `UPDATE qrcodes
               SET id = ?, is_synced = 1, updated = ?, qr_index = ?, created = ?, metadata = ?, metadata_type = ?, account_name = ?, account_number = ?, type = ?, code = ?, is_deleted = ?
               WHERE id = ? AND user_id = ?`,
              [
                serverRecord.id,
                serverRecord.updated,
                serverRecord.qr_index,
                serverRecord.created,
                serverRecord.metadata,
                serverRecord.metadata_type,
                serverRecord.account_name,
                serverRecord.account_number,
                serverRecord.type,
                serverRecord.code,
                serverRecord.is_deleted,
                itemToCreate.localId,
                userId,
              ]
            );
          } catch (e: any) {
            console.error(
              `[qrDB] syncQrCodes: Failed to create server record for local ID ${itemToCreate.localId}:`,
              e.response?.data || e.message || e
            );
          }
        }
      }

      // Perform Updates
      if (recordsToUpdatePayloads.length > 0) {
        for (const itemToUpdate of recordsToUpdatePayloads) {
          try {
            const updatedRecord = await pb
              .collection("qr")
              .update<ServerRecord>(itemToUpdate.id, itemToUpdate.data);
            await db.runAsync(
              `UPDATE qrcodes SET is_synced = 1, updated = ? WHERE id = ? AND user_id = ?`,
              [updatedRecord.updated, itemToUpdate.id, userId]
            );
          } catch (e: any) {
            console.error(
              `[qrDB] syncQrCodes: Failed to update server record ${itemToUpdate.id}:`,
              e.response?.data || e.message || e
            );
          }
        }
      }
    }
  } catch (error) {
    console.error(`[qrDB] Error during sync for user ${userId}:`, error);
    throw error;
  }
}

/**
 * NEW HELPER FUNCTION
 * Gets the timestamp of the most recently synced item for a user.
 */
export async function getLatestSyncedTimestamp(
  userId: string
): Promise<string | null> {
  if (userId === GUEST_USER_ID || !userId) {
    return null;
  }
  const db = await openDatabase();
  try {
    const result = await db.getFirstAsync<{ updated: string }>(
      "SELECT MAX(updated) as updated FROM qrcodes WHERE user_id = ? AND is_synced = 1",
      userId
    );
    return result?.updated || null;
  } catch (error) {
    console.error(
      `[qrDB] Error getting latest synced timestamp for user ${userId}:`,
      error
    );
    return null;
  }
}

/**
 * Fetch new or updated server data for a specific user.
 *
 * *** REFACTORED ***
 * Now accepts an optional `sinceTimestamp` to allow the caller to control
 * the time window, preventing the push/pull race condition.
 */
export async function fetchServerData(
  userId: string,
  sinceTimestamp: string | null = null
): Promise<QRRecord[]> {
  if (userId === GUEST_USER_ID || !userId) {
    return [];
  }

  try {
    let filter = `user_id = '${userId}'`;
    if (sinceTimestamp) {
      const formattedTimestamp = new Date(sinceTimestamp)
        .toISOString()
        .replace("T", " ")
        .substring(0, 19);
      filter += ` && updated > '${formattedTimestamp}'`;
    }
    filter += ` && is_deleted = false`;

    console.log(`[qrDB] fetchServerData: Fetching with filter: ${filter}`);

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

    console.log(
      `[qrDB] fetchServerData: Fetched ${allServerItems.length} items from server.`
    );

    return allServerItems.map((item): QRRecord => {
      if (
        !item.id ||
        typeof item.qr_index !== "number" ||
        !item.user_id ||
        !item.code ||
        !item.metadata ||
        !item.metadata_type ||
        !item.type ||
        !item.created ||
        !item.updated
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
  } catch (error: any) {
    console.error(
      `[qrDB] Error fetching or validating server data for user ${userId}:`,
      error.response?.data || error.message || error
    );
    throw error;
  }
}

export async function insertOrUpdateQrCodes(
  qrDataArray: QRRecord[]
): Promise<void> {
  if (!qrDataArray || qrDataArray.length === 0) return;
  const db = await openDatabase();

  try {
    await db.runAsync("BEGIN TRANSACTION;");

    for (const qrData of qrDataArray) {
      const existingRecord = await db.getFirstAsync<QRRecord>(
        "SELECT id, updated, user_id, is_deleted FROM qrcodes WHERE id = ?",
        qrData.id
      );

      if (existingRecord) {
        if (
          new Date(qrData.updated) > new Date(existingRecord.updated) ||
          qrData.user_id !== existingRecord.user_id ||
          qrData.is_deleted !== existingRecord.is_deleted
        ) {
          await db.runAsync(
            `UPDATE qrcodes
             SET qr_index = ?, user_id = ?, code = ?, metadata = ?, metadata_type = ?,
             account_name = ?, account_number = ?, type = ?, updated = ?,
             is_deleted = ?, is_synced = ?
             WHERE id = ?`,
            [
              qrData.qr_index,
              qrData.user_id,
              qrData.code,
              qrData.metadata,
              qrData.metadata_type,
              qrData.account_name || null,
              qrData.account_number || null,
              qrData.type,
              qrData.updated,
              qrData.is_deleted ? 1 : 0,
              qrData.is_synced ? 1 : 0,
              qrData.id,
            ]
          );
        }
      } else {
        await db.runAsync(
          `INSERT INTO qrcodes
          (id, qr_index, user_id, code, metadata, metadata_type, account_name,
           account_number, type, created, updated, is_deleted, is_synced)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            qrData.id,
            qrData.qr_index,
            qrData.user_id,
            qrData.code,
            qrData.metadata,
            qrData.metadata_type,
            qrData.account_name || null,
            qrData.account_number || null,
            qrData.type,
            qrData.created,
            qrData.updated,
            qrData.is_deleted ? 1 : 0,
            qrData.is_synced ? 1 : 0,
          ]
        );
      }
    }
    await db.runAsync("COMMIT;");
  } catch (error) {
    await db.runAsync("ROLLBACK;");
    console.error("[qrDB] Failed to insert/update QR codes:", error);
    throw error;
  }
}

export async function searchQrCodes(
  userId: string,
  searchQuery: string = ""
): Promise<QRRecord[]> {
  const db = await openDatabase();
  try {
    const queryParams: any[] = [userId];
    let sqlQuery = `SELECT * FROM qrcodes WHERE user_id = ? AND is_deleted = 0`;

    if (searchQuery.trim()) {
      const matchingCodes = returnItems(searchQuery);
      const searchTerms = Array.from(
        new Set([searchQuery.trim(), ...matchingCodes])
      );
      const searchConditions: string[] = [];

      searchTerms.forEach((term) => {
        const termParam = `%${term}%`;
        searchConditions.push(`code LIKE ?`);
        queryParams.push(termParam);
        searchConditions.push(`metadata LIKE ?`);
        queryParams.push(termParam);
        searchConditions.push(`account_name LIKE ?`);
        queryParams.push(termParam);
        searchConditions.push(`account_number LIKE ?`);
        queryParams.push(termParam);
        searchConditions.push(`type LIKE ?`);
        queryParams.push(termParam);
      });
      if (searchConditions.length > 0) {
        sqlQuery += ` AND (${searchConditions.join(" OR ")})`;
      }
    }

    sqlQuery += ` ORDER BY qr_index ASC`;
    return await db.getAllAsync<QRRecord>(sqlQuery, ...queryParams);
  } catch (error) {
    console.error(
      `[qrDB] Error searching QR codes for user ${userId} with query "${searchQuery}":`,
      error
    );
    return [];
  }
}

export async function filterQrCodesByType(
  userId: string,
  filter: string = "all"
): Promise<QRRecord[]> {
  const db = await openDatabase();
  try {
    let sqlQuery = `SELECT * FROM qrcodes WHERE user_id = ? AND is_deleted = 0`;
    const queryParams: any[] = [userId];

    if (filter !== "all") {
      sqlQuery += ` AND type = ?`;
      queryParams.push(filter);
    }

    sqlQuery += ` ORDER BY qr_index ASC`;
    return await db.getAllAsync<QRRecord>(sqlQuery, ...queryParams);
  } catch (error) {
    console.error(
      `[qrDB] Error filtering QR codes by type "${filter}" for user ${userId}:`,
      error
    );
    return [];
  }
}

export async function updateQrIndexes(
  qrDataArray: QRRecord[],
  userId: string
): Promise<void> {
  if (!qrDataArray || qrDataArray.length === 0) return;

  const validQrData = qrDataArray.filter((qr) => qr.user_id === userId);
  if (validQrData.length === 0) {
    return;
  }

  const db = await openDatabase();
  const updatedAt = new Date().toISOString();
  const isSyncedValue = userId === GUEST_USER_ID ? 1 : 0;

  try {
    await db.runAsync("BEGIN TRANSACTION;");
    for (const qr of validQrData) {
      const newIndex = typeof qr.qr_index === "number" ? qr.qr_index : -1;
      if (newIndex === -1) {
        console.warn(
          `[qrDB] updateQrIndexes: Invalid qr_index for item ${qr.id}. Skipping update for this item.`
        );
        continue;
      }
      await db.runAsync(
        `UPDATE qrcodes
         SET qr_index = ?, updated = ?, is_synced = ?
         WHERE id = ? AND user_id = ?`,
        [newIndex, updatedAt, isSyncedValue, qr.id, userId]
      );
    }
    await db.runAsync("COMMIT;");
  } catch (error) {
    await db.runAsync("ROLLBACK;");
    console.error(
      `[qrDB] Failed to update QR indexes for user ${userId}:`,
      error
    );
    throw error;
  }
}

export async function getNextQrIndex(userId: string): Promise<number> {
  const db = await openDatabase();
  try {
    const result = await db.getFirstAsync<{ maxIndex: number | null }>(
      "SELECT MAX(qr_index) as maxIndex FROM qrcodes WHERE user_id = ? AND is_deleted = 0",
      userId
    );
    return (result?.maxIndex ?? -1) + 1;
  } catch (error) {
    console.error(
      `[qrDB] Error getting next QR index for user ${userId}:`,
      error
    );
    return 0;
  }
}

/**
 * Transfers QR codes from the guest account to a newly logged-in user.
 * This function NO LONGER assigns a new index. It simply re-assigns the
 * user_id and marks the records as unsynced. The `syncWithServer` process
 * will handle creating these records on the server and receiving the correct,
 * authoritative index from the server.
 */
export async function transferGuestDataToUser(newUserId: string): Promise<void> {
  console.log(
    `[qrDB] transferGuestDataToUser: Called for newUserId: ${newUserId}`
  );
  if (!newUserId || newUserId === GUEST_USER_ID) {
    console.warn(
      "[qrDB] transferGuestDataToUser: Skipped due to invalid newUserId."
    );
    return;
  }

  const db = await openDatabase();
  try {
    await db.runAsync("BEGIN TRANSACTION;");
    console.log("[qrDB] transferGuestDataToUser: Transaction started.");

    const guestQrRecords = await db.getAllAsync<QRRecord>(
      "SELECT * FROM qrcodes WHERE user_id = ? AND is_deleted = 0",
      GUEST_USER_ID
    );
    console.log(
      `[qrDB] transferGuestDataToUser: Found ${guestQrRecords.length} guest records to migrate.`
    );

    if (!guestQrRecords.length) {
      console.log("[qrDB] transferGuestDataToUser: No guest data to migrate.");
      await db.runAsync("COMMIT;");
      return;
    }

    const now = new Date().toISOString();

    // Re-assign all guest records to the new user and mark them for sync.
    // We DO NOT change the qr_index here. The server will assign the correct index.
    await db.runAsync(
      `UPDATE qrcodes
       SET user_id = ?, is_synced = 0, updated = ?
       WHERE user_id = ?`,
      [newUserId, now, GUEST_USER_ID]
    );

    await db.runAsync("COMMIT;");
    console.log(
      `[qrDB] transferGuestDataToUser: Successfully re-assigned ${guestQrRecords.length} guest records to user ${newUserId}. They are now marked for sync.`
    );
  } catch (error) {
    await db.runAsync("ROLLBACK;");
    console.error(
      `[qrDB] transferGuestDataToUser: Error migrating guest data to user ${newUserId}:`,
      error
    );
    throw error;
  }
}

export async function closeDatabase(): Promise<void> {
  const db = await openDatabase();
  try {
    await db.closeAsync();
  } catch (error) {
    console.error("[qrDB] Error closing the database:", error);
  }
}