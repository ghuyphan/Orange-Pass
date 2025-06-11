import pb from "@/services/pocketBase";
import { openDatabase } from "../userDB"; // Assuming userDB handles DB connection
import QRRecord from "@/types/qrType";
import ServerRecord from "@/types/serverDataTypes"; // Assuming you have this type defined

import { returnItems } from "@/utils/returnItemData";

import { GUEST_USER_ID } from "@/constants/Constants";
const ITEMS_PER_PAGE = 50;

/**
 * Create the QR table and its indexes within one transaction.
 * IMPORTANT: The FOREIGN KEY (user_id) REFERENCES users(id) constraint
 * means that if you strictly enforce foreign keys (e.g., with PRAGMA foreign_keys = ON),
 * you must have a user record in the 'users' table with id = GUEST_USER_ID (i.e., id = "")
 * for guest QR codes to be inserted. SQLite by default does NOT enforce foreign keys
 * unless explicitly enabled per-connection.
 */
export async function createQrTable(): Promise<void> {
  const db = await openDatabase();
  try {
    await db.runAsync("BEGIN TRANSACTION;");

    // Added NOT NULL constraints where applicable for data integrity
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS qrcodes (
        id TEXT PRIMARY KEY NOT NULL,
        qr_index INTEGER NOT NULL,
        user_id TEXT NOT NULL, -- Empty string "" for guest user_id
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
    ); // Added index for is_synced
    await db.execAsync(
      "CREATE INDEX IF NOT EXISTS idx_qr_index ON qrcodes(qr_index);"
    );

    await db.runAsync("COMMIT;");
     ("[qrDB] qrcodes table created/verified successfully.");
  } catch (error) {
    await db.runAsync("ROLLBACK;");
    console.error("[qrDB] Error creating qr table or indexes:", error);
    throw error; // Re-throw to allow caller to handle
  }
}

/**
 * Retrieve a QR code by ID for a specific user (or guest).
 */
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

/**
 * Retrieve QR codes by user ID (or guest), ordered by qr_index.
 */
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

/**
 * Check if any non-deleted local data exists for the given user (or guest).
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
    console.error(
      `[qrDB] Error checking for local data for user ${userId}:`,
      error
    );
    return false;
  }
}

/**
 * Soft-delete a QR code for a specific user (or guest).
 * For guests, is_synced remains 1 (true). For logged-in users, is_synced becomes 0 (false).
 */
export async function deleteQrCode(id: string, userId: string): Promise<void> {
  const db = await openDatabase();
  try {
    const updatedAt = new Date().toISOString();
    // Guest items are "synced" locally as they don't go to a server.
    // User items need to sync their deletion.
    const isSyncedValue = userId === GUEST_USER_ID ? 1 : 0;
    await db.runAsync(
      `
      UPDATE qrcodes
      SET is_deleted = 1, updated = ?, is_synced = ?
      WHERE id = ? AND user_id = ?
    `,
      [updatedAt, isSyncedValue, id, userId]
    );
     (`[qrDB] Soft-deleted QR code ${id} for user ${userId}.`);
  } catch (error) {
    console.error(
      `[qrDB] Failed to soft-delete QR code ${id} for user ${userId}:`,
      error
    );
    throw error;
  }
}

/**
 * Bulk insert QR codes using transactions. Allows GUEST_USER_ID.
 * Assumes incoming qrData.is_synced is set correctly.
 * (e.g., true for new guest items, false for new user items needing sync).
 */
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
    qrData.user_id, // Can be GUEST_USER_ID
    qrData.code,
    qrData.metadata,
    qrData.metadata_type,
    qrData.account_name || null, // Use null for empty optional strings
    qrData.account_number || null, // Use null for empty optional strings
    qrData.type,
    qrData.created,
    qrData.updated,
    qrData.is_deleted ? 1 : 0,
    qrData.is_synced ? 1 : 0, // Honor incoming is_synced status
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
     (`[qrDB] Bulk inserted ${qrDataArray.length} QR codes.`);
  } catch (error) {
    await db.runAsync("ROLLBACK;");
    console.error("[qrDB] Failed to insert bulk QR codes:", error);
    throw error;
  }
}

/**
 * Get unsynced (is_synced = 0) and not deleted QR codes for a user.
 * Returns empty array for guests (as they don't sync with a server this way).
 */
export async function getUnsyncedQrCodes(userId: string): Promise<QRRecord[]> {
  if (userId === GUEST_USER_ID) {
    return []; // Guests don't have "unsynced" items in the server sense
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

/**
 * Retrieve locally soft-deleted QR codes that need their deletion synced to the server.
 * Returns empty array for guests.
 */
export async function getLocallyDeletedQrCodes(
  userId: string
): Promise<QRRecord[]> {
  if (userId === GUEST_USER_ID) {
    return []; // Guest deletions are local only
  }
  const db = await openDatabase();
  try {
    // These are items marked as deleted locally but the deletion hasn't been synced.
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

/**
 * Synchronize local QR code changes (creations, updates, deletions) with the server for a specific user.
 * No-op for guests or invalid userId.
 */
export async function syncQrCodes(userId: string): Promise<void> {
  if (userId === GUEST_USER_ID || !userId) {
     (
      "[qrDB] syncQrCodes: Skipped for guest or invalid userId."
    );
    return;
  }
   (`[qrDB] syncQrCodes: Starting sync for userId: ${userId}`);
  const db = await openDatabase();

  try {
    const unsyncedChanges = await getUnsyncedQrCodes(userId);
    const locallyDeleted = await getLocallyDeletedQrCodes(userId);

     (
      `[qrDB] syncQrCodes: Found ${unsyncedChanges.length} unsynced changes to potentially create/update.`
    );
     (
      `[qrDB] syncQrCodes: Found ${locallyDeleted.length} locally deleted items to delete/mark on server.`
    );

    // --- Handle Deletions on Server ---
    if (locallyDeleted.length > 0) {
       (
        `[qrDB] syncQrCodes: Processing ${locallyDeleted.length} locally deleted records for server.`
      );
      const serverDeletionPromises = locallyDeleted.map((qr) =>
        pb
          .collection("qr")
          .update(qr.id, { is_deleted: true, updated: new Date().toISOString() }) // Also update server 'updated'
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
          [
            new Date().toISOString(),
            ...successfullyDeletedServerIds,
            userId,
          ]
        );
         (
          `[qrDB] syncQrCodes: Marked ${successfullyDeletedServerIds.length} server-deleted records as synced locally.`
        );
      }
    }

    // --- Handle Creations/Updates on Server for items NOT marked as deleted locally ---
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
          // Potentially treat all as creates if this fails, or handle error more gracefully
        }
      }
      const serverRecordMap = new Map(
        serverRecords.map((rec) => [
          rec.id,
          { updated: rec.updated, is_deleted: rec.is_deleted },
        ])
      );

      // Type fix: payload can include is_synced if server schema has it
      const recordsToCreatePayloads: {
        localId: string;
        payload: Omit<QRRecord, "id">; // Server generates ID, payload contains other fields
      }[] = [];
      const recordsToUpdatePayloads: {
        id: string; // This is the server ID
        data: Partial<Omit<QRRecord, "id" | "is_synced">>;
      }[] = [];

      for (const qrCode of itemsToUpsertOnServer) {
        const { id: localId, is_synced, ...dataForServer } = qrCode;
        const serverInfo = serverRecordMap.get(localId);
        const payloadWithUser = { ...dataForServer, user_id: userId };

        if (serverInfo) {
          // Record with this ID exists on server
          if (
            !serverInfo.is_deleted &&
            new Date(qrCode.updated) > new Date(serverInfo.updated)
          ) {
             (
              `[qrDB] syncQrCodes: Preparing UPDATE for server record ID ${localId}.`
            );
            recordsToUpdatePayloads.push({
              id: localId,
              data: payloadWithUser,
            });
          } else if (serverInfo.is_deleted) {
             (
              `[qrDB] syncQrCodes: Server record ID ${localId} is marked deleted. Local is not. Potential conflict/resurrection.`
            );
            if (new Date(qrCode.updated) > new Date(serverInfo.updated)) {
               (
                `[qrDB] syncQrCodes: Preparing UPDATE (to undelete) for server record ID ${localId}.`
              );
              recordsToUpdatePayloads.push({
                id: localId,
                data: { ...payloadWithUser, is_deleted: false },
              });
            }
          } else {
             (
              `[qrDB] syncQrCodes: Server record ID ${localId} is newer or same and not deleted. Marking local as synced.`
            );
            await db.runAsync(
              `UPDATE qrcodes SET is_synced = 1, updated = ? WHERE id = ? AND user_id = ?`,
              [serverInfo.updated, localId, userId]
            );
          }
        } else {
          // Record with this localId does NOT exist on server, so create it
           (
            `[qrDB] syncQrCodes: Preparing CREATE for local record ID ${localId}.`
          );
          // Payload for server creation:
          // - Does NOT include 'localId' (server generates its own ID)
          // - Includes 'is_deleted: false' (it's a new, active record)
          // - Includes 'is_synced: true' IF your server schema has this field and you want to set it.
          //   Otherwise, remove 'is_synced' from this payload.
          recordsToCreatePayloads.push({
            localId, // Keep localId to update the correct local record later
            payload: { ...payloadWithUser, is_deleted: false, is_synced: true },
          });
        }
      }

      // Perform Creations
      if (recordsToCreatePayloads.length > 0) {
         (
          `[qrDB] syncQrCodes: Creating ${recordsToCreatePayloads.length} records on server for user ${userId}.`
        );
        for (const itemToCreate of recordsToCreatePayloads) {
          try {
            // itemToCreate.payload does NOT include an 'id' field if server generates it
            const serverRecord = await pb
              .collection("qr")
              .create<ServerRecord>(itemToCreate.payload);

            // IMPORTANT: Update the local record with the new server-generated ID
            // and mark it as synced.
            await db.runAsync(
              `UPDATE qrcodes
               SET id = ?, is_synced = 1, updated = ?, qr_index = ?, created = ?, metadata = ?, metadata_type = ?, account_name = ?, account_number = ?, type = ?, code = ?, is_deleted = ?
               WHERE id = ? AND user_id = ?`,
              [
                serverRecord.id, // New server ID
                serverRecord.updated,
                serverRecord.qr_index, // Use server's qr_index if it's authoritative
                serverRecord.created,
                serverRecord.metadata, // Assuming serverRecord contains all necessary fields
                                       // matching QRRecord after creation
                serverRecord.metadata_type,
                serverRecord.account_name,
                serverRecord.account_number,
                serverRecord.type,
                serverRecord.code,
                serverRecord.is_deleted, // Should be false from payload
                itemToCreate.localId, // Old local ID to find the record
                userId,
              ]
            );
             (
              `[qrDB] syncQrCodes: Successfully created server record (new ID: ${serverRecord.id}) for local ID ${itemToCreate.localId}. Local record updated and synced.`
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
         (
          `[qrDB] syncQrCodes: Updating ${recordsToUpdatePayloads.length} records on server for user ${userId}.`
        );
        for (const itemToUpdate of recordsToUpdatePayloads) {
          try {
            const updatedRecord = await pb
              .collection("qr")
              .update<ServerRecord>(itemToUpdate.id, itemToUpdate.data);
            await db.runAsync(
              `UPDATE qrcodes SET is_synced = 1, updated = ? WHERE id = ? AND user_id = ?`,
              [updatedRecord.updated, itemToUpdate.id, userId]
            );
             (
              `[qrDB] syncQrCodes: Successfully updated server record ${itemToUpdate.id}. Marked local as synced.`
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
     (`[qrDB] Sync completed for user: ${userId}`);
  } catch (error) {
    console.error(`[qrDB] Error during sync for user ${userId}:`, error);
    // Do not re-throw here if you want the calling function (e.g., in HomeScreen)
    // to handle UI updates like setting syncStatus to 'error' without crashing.
    // Or re-throw if the caller is prepared to catch it.
    // For now, let's re-throw as per original structure.
    throw error;
  }
}

/**
 * Fetch new or updated server data for a specific user since the last local update.
 * No-op for guests or invalid userId.
 */
export async function fetchServerData(userId: string): Promise<QRRecord[]> {
  if (userId === GUEST_USER_ID || !userId) {
    return [];
  }

  try {
    const db = await openDatabase();
    const latestLocalUpdateResult = await db.getFirstAsync<{
      updated: string;
    }>("SELECT MAX(updated) as updated FROM qrcodes WHERE user_id = ? AND is_synced = 1", userId);
    const latestLocalUpdate = latestLocalUpdateResult?.updated || null;

    let filter = `user_id = '${userId}'`; // Ensure userId is properly escaped if it can contain special chars, though PB SDK might handle this.
    if (latestLocalUpdate) {
      const formattedTimestamp = new Date(latestLocalUpdate)
        .toISOString()
        .replace("T", " ")
        .substring(0, 19); // PocketBase specific format
      filter += ` && updated > '${formattedTimestamp}'`;
    }
     // Fetch non-deleted items primarily, or handle deletions based on is_deleted flag
    filter += ` && is_deleted = false`;


    let allServerItems: ServerRecord[] = [];
    let currentPage = 1;
    let totalPages = 1;

     (`[qrDB] fetchServerData: Fetching with filter: ${filter}`);

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

     (`[qrDB] fetchServerData: Fetched ${allServerItems.length} items from server.`);


    return allServerItems.map((item): QRRecord => {
      if (
        !item.id ||
        typeof item.qr_index !== "number" ||
        !item.user_id || // This should match the userId we are fetching for
        !item.code ||
        !item.metadata ||
        !item.metadata_type ||
        !item.type ||
        !item.created ||
        !item.updated // is_deleted can be false
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
        is_deleted: item.is_deleted, // This will be false due to filter, or server's current state
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

/**
 * Insert or update QR codes in the local database. Allows GUEST_USER_ID.
 * Honors incoming is_synced status.
 */
export async function insertOrUpdateQrCodes(
  qrDataArray: QRRecord[]
): Promise<void> {
  if (!qrDataArray || qrDataArray.length === 0) return;
  const db = await openDatabase();

  try {
    await db.runAsync("BEGIN TRANSACTION;");

    for (const qrData of qrDataArray) {
      // Check if record exists
      const existingRecord = await db.getFirstAsync<QRRecord>(
        "SELECT id, updated, user_id FROM qrcodes WHERE id = ?",
        qrData.id
      );

      if (existingRecord) {
        // Record exists: update if incoming data is newer OR if user_id is changing
        // (e.g., guest data being assigned to a real user after migration)
        // OR if the deletion status is different (server undeleted an item)
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
              qrData.is_synced ? 1 : 0, // Data from server or being bulk inserted is considered synced
              qrData.id,
            ]
          );
        } else {
          // If local is_deleted is true, but server data (qrData) has is_deleted false
          // and server data is newer, it's an undelete. The above condition handles it.
          // If server data is older or same, and local is_deleted is true, do nothing to preserve local deletion
          // unless explicitly told server version is authoritative for is_deleted status.
          // The current logic: if server data (qrData) is newer, it overwrites.
        }
      } else {
        // Record does not exist: insert
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
            qrData.is_synced ? 1 : 0, // Data from server or being bulk inserted is considered synced
          ]
        );
      }
    }
    await db.runAsync("COMMIT;");
    //  (`[qrDB] Inserted/Updated ${qrDataArray.length} QR codes.`);
  } catch (error) {
    await db.runAsync("ROLLBACK;");
    console.error("[qrDB] Failed to insert/update QR codes:", error);
    throw error;
  }
}

/**
 * Search QR codes for a specific user (or guest) based on a query string.
 */
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

/**
 * Filter QR codes by type for a specific user (or guest).
 */
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

/**
 * Update the qr_index values and the 'updated' timestamp for an array of QR codes
 * belonging to a specific user (or guest).
 * Sets is_synced to 0 for users, 1 for guests, as reordering is a local change needing sync for users.
 */
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

/**
 * Get the next available QR index for a user (or guest).
 */
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
 */
export async function transferGuestDataToUser(newUserId: string): Promise<void> {
   (
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
     ("[qrDB] transferGuestDataToUser: Transaction started.");

    const guestQrRecords = await db.getAllAsync<QRRecord>(
      "SELECT * FROM qrcodes WHERE user_id = ? AND is_deleted = 0 ORDER BY qr_index ASC",
      GUEST_USER_ID
    );
     (
      `[qrDB] transferGuestDataToUser: Found ${guestQrRecords.length} guest records.`
    );

    if (!guestQrRecords.length) {
       ("[qrDB] transferGuestDataToUser: No guest data to migrate.");
      await db.runAsync("COMMIT;"); // Commit even if no data to ensure transaction is closed
      return;
    }

    const nextUserStartIndex = await getNextQrIndex(newUserId);
     (
      `[qrDB] transferGuestDataToUser: Next user start index: ${nextUserStartIndex}`
    );
    const now = new Date().toISOString();

    for (let i = 0; i < guestQrRecords.length; i++) {
      const guestRecord = guestQrRecords[i];
      const newQrIndex = nextUserStartIndex + i;
       (
        `[qrDB] transferGuestDataToUser: Migrating guest record ID ${guestRecord.id} to user ${newUserId}, new index ${newQrIndex}`
      );
      // When transferring, the item becomes unsynced for the new user
      await db.runAsync(
        `UPDATE qrcodes
         SET user_id = ?, qr_index = ?, is_synced = 0, updated = ?
         WHERE id = ? AND user_id = ?`, // Ensure we only update the specific guest record
        [newUserId, newQrIndex, now, guestRecord.id, GUEST_USER_ID]
      );
    }

    await db.runAsync("COMMIT;");
     (
      `[qrDB] transferGuestDataToUser: Successfully migrated ${guestQrRecords.length} guest QR records to user ${newUserId}. Transaction committed.`
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

/**
 * Close the database connection.
 */
export async function closeDatabase(): Promise<void> {
  const db = await openDatabase();
  try {
    await db.closeAsync();
     ("[qrDB] Database connection closed.");
  } catch (error) {
    console.error("[qrDB] Error closing the database:", error);
  }
}
