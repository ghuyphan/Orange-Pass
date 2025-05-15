import pb from "@/services/pocketBase";
import { openDatabase } from "../userDB";
import QRRecord from "@/types/qrType";
import ServerRecord from "@/types/serverDataTypes";
import { returnItems } from "@/utils/returnItemData";

/**
 * Create the QR table and its indexes within one transaction
 */
const ITEMS_PER_PAGE = 50

export async function createQrTable() {
  const db = await openDatabase();
  try {
    await db.runAsync("BEGIN TRANSACTION");

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
  } catch (error) {
    await db.runAsync("ROLLBACK");
    console.error("Error creating qr table or indexes:", error);
  }
}

/**
 * Retrieve a QR code by ID, ensuring it is not marked as deleted
 */
export async function getQrCodeById(id: string) {
  const db = await openDatabase();
  try {
    return await db.getFirstAsync<QRRecord>(
      "SELECT * FROM qrcodes WHERE id = ? AND is_deleted = 0",
      id
    );
  } catch (error) {
    console.error("Error retrieving QR code by ID:", error);
    return null;
  }
}

/**
 * Retrieve QR codes by user ID.
 */
export async function getQrCodesByUserId(userId: string) {
  const db = await openDatabase();
  try {
    return await db.getAllAsync<QRRecord>(
      "SELECT * FROM qrcodes WHERE user_id = ? AND is_deleted = 0 ORDER BY qr_index",
      userId
    );
  } catch (error) {
    console.error("Error retrieving QR codes by user ID:", error);
    return [];
  }
}

/**
 * Check if any local data exists for the given user.
 */
export async function hasLocalData(userId: string): Promise<boolean> {
  const db = await openDatabase();
  try {
    const result = await db.getFirstAsync<{ count: number }>(
      "SELECT COUNT(*) as count FROM qrcodes WHERE user_id = ?",
      userId
    );
    return (result?.count ?? 0) > 0;
  } catch (error) {
    console.error("Error checking for local data:", error);
    return false; // Assume no data on error
  }
}

/**
 * Soft-delete a QR code (mark as deleted and update timestamp).
 */
export async function deleteQrCode(id: string) {
  const db = await openDatabase();
  try {
    const updatedAt = new Date().toISOString();
    await db.runAsync(
      `
      UPDATE qrcodes
      SET is_deleted = 1, updated = ?, is_synced = 0
      WHERE id = ?
    `,
      [updatedAt, id]
    );
  } catch (error) {
    console.error(`Failed to soft-delete QR code ${id}:`, error);
    throw error;
  }
}

/**
 * Bulk insert QR codes using transactions.
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
  qrDataArray.forEach((qrData) => {
    values.push(
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
      qrData.is_synced ? 1 : 0
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
  } catch (error) {
    await db.runAsync("ROLLBACK");
    console.error("Failed to insert bulk QR codes:", error);
  }
}

/**
 * Return the unsynced QR codes for a user.
 */
export async function getUnsyncedQrCodes(userId: string) {
  const db = await openDatabase();
  try {
    return await db.getAllAsync<QRRecord>(
      "SELECT * FROM qrcodes WHERE is_synced = 0 AND user_id = ?",
      userId
    );
  } catch (error) {
    console.error("Error retrieving unsynced QR codes:", error);
    return [];
  }
}

/**
 * Retrieve only the locally deleted QR codes (just the IDs).
 */
export async function getLocallyDeletedQrCodes(userId: string) {
  const db = await openDatabase();
  try {
    return await db.getAllAsync<QRRecord>(
      "SELECT id FROM qrcodes WHERE user_id = ? AND is_deleted = 1",
      userId
    );
  } catch (error) {
    console.error("Error retrieving locally deleted QR codes:", error);
    return [];
  }
}

/**
 * Synchronize local QR code changes with your server.
 * - Deleted records are removed from the server.
 * - Modified and new records are created/updated on the server.
 * - Once synced, local records are marked as synced.
 */
export async function syncQrCodes(userId: string) {
  const db = await openDatabase();
  try {
    // 1. Get unsynced QR codes.
    const unsyncedQrCodes = await getUnsyncedQrCodes(userId);

    // 2. Separate deleted and modified records.
    const locallyDeletedQrCodes = unsyncedQrCodes.filter((qr) => qr.is_deleted);
    const locallyModifiedQrCodes = unsyncedQrCodes.filter(
      (qr) => !qr.is_deleted
    );

    // 3. Process deletions on the server.
    if (locallyDeletedQrCodes.length > 0) {
      await Promise.all(
        locallyDeletedQrCodes.map((qr) => pb.collection("qr").delete(qr.id))
      );
    }

    // 4. Build filter expression for modified records.
    const filterExpression = locallyModifiedQrCodes
      .map((qr) => `id='${qr.id}'`)
      .join(" || ");
    let serverRecords: ServerRecord[] = [];
    if (filterExpression) {
      serverRecords = await pb.collection("qr").getFullList({
        filter: filterExpression,
        fields: "id,updated",
      });
    }
    const serverRecordMap = new Map(
      serverRecords.map((rec) => [rec.id, rec.updated])
    );

    // 5. Determine which records to create or update on the server.
    const recordsToCreate: QRRecord[] = [];
    const recordsToUpdate: { id: string; data: QRRecord }[] = [];
    for (const qrCode of locallyModifiedQrCodes) {
      const serverUpdated = serverRecordMap.get(qrCode.id);
      if (serverUpdated) {
        if (new Date(qrCode.updated) > new Date(serverUpdated)) {
          recordsToUpdate.push({ id: qrCode.id, data: qrCode });
        }
      } else {
        recordsToCreate.push(qrCode);
      }
    }

    // 6. Batch create/update on the server.
    if (recordsToCreate.length > 0) {
      await Promise.all(
        recordsToCreate.map((record) => pb.collection("qr").create(record))
      );
    }
    if (recordsToUpdate.length > 0) {
      await Promise.all(
        recordsToUpdate.map(({ id, data }) =>
          pb.collection("qr").update(id, data)
        )
      );
    }

    // 7. Mark all unsynced QR codes as synced locally.
    const idsToUpdate = unsyncedQrCodes.map((qr) => qr.id);
    if (idsToUpdate.length > 0) {
      const placeholders = idsToUpdate.map(() => "?").join(",");
      await db.runAsync(
        `UPDATE qrcodes SET is_synced = 1 WHERE id IN (${placeholders})`,
        ...idsToUpdate
      );
    }
  } catch (error) {
    console.error("Error during sync:", error);
    throw error;
  }
}

/**
 * Fetch new/updated server data.
 * Combines local filtering (deleted IDs and last local update) into the server query.
 */
export async function fetchServerData(userId: string): Promise<ServerRecord[]> {
  try {
    // 1. Get locally deleted QR code IDs.
    const locallyDeletedQrCodes = await getLocallyDeletedQrCodes(userId);
    const deletedIds = locallyDeletedQrCodes.map((item) => item.id);

    // 2. Get the latest update timestamp from local data.
    const db = await openDatabase();
    const latestLocalUpdateResult = await db.getFirstAsync<{ updated: string }>(
      "SELECT MAX(updated) as updated FROM qrcodes WHERE user_id = ?",
      userId
    );
    const latestLocalUpdate = latestLocalUpdateResult?.updated || null;

    // 3. Construct filter to exclude deleted items and records older than the last update.
    let filter = `user_id = '${userId}'`;
    if (deletedIds.length > 0) {
      filter += ` && id != '${deletedIds.join("' && id != '")}'`;
    }
    if (latestLocalUpdate) {
      // Ensure the timestamp is in a format PocketBase expects (ISO 8601)
      // and properly quoted for the filter string.
      const formattedTimestamp = new Date(latestLocalUpdate)
        .toISOString()
        .replace("T", " ")
        .substring(0, 19); // PocketBase often uses 'YYYY-MM-DD HH:MM:SS'
      filter += ` && updated > '${formattedTimestamp}'`;
    }

    // 4. Fetch data from the server with pagination.
    let allServerItems: any[] = [];
    let currentPage = 1;
    let totalPages = 1;

    do {
      const serverDataPage = await pb.collection("qr").getList(
        currentPage,
        ITEMS_PER_PAGE,
        {
          filter,
          sort: "updated", // Sort by 'updated' to process in order
        }
      );

      if (serverDataPage.items && serverDataPage.items.length > 0) {
        allServerItems = allServerItems.concat(serverDataPage.items);
      }
      totalPages = serverDataPage.totalPages;
      currentPage++;
    } while (currentPage <= totalPages);

    // 5. Validate and transform the data.
    const validatedServerData: ServerRecord[] = allServerItems.map((item) => {
      if (
        !item.id ||
        item.qr_index === undefined || // Ensure qr_index is present
        !item.user_id ||
        !item.code ||
        !item.metadata ||
        !item.metadata_type ||
        !item.type ||
        !item.created ||
        !item.updated ||
        item.is_deleted === undefined // Check boolean presence
      ) {
        console.warn("Invalid server data format for item:", item);
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
        metadata_type: item.metadata_type,
        account_name: item.account_name || null,
        account_number: item.account_number || null,
        type: item.type,
        created: item.created,
        updated: item.updated,
        is_deleted: item.is_deleted,
        collectionId: item.collectionId || "", // Get from item if available
        collectionName: item.collectionName || "", // Get from item if available
        is_synced: true, // Data fetched from server is considered synced
      };
    });

    return validatedServerData;
  } catch (error) {
    console.error("Error fetching or validating server data:", error);
    throw error; // Re-throw to allow calling function to handle
  }
}

/**
 * Insert or update QR codes in the local database.
 * First, the existing records are checked (in bulk) then separated into
 * two groups: records to insert and records to update.
 */
export async function insertOrUpdateQrCodes(
  qrDataArray: QRRecord[]
): Promise<void> {
  if (!qrDataArray.length) return;
  const db = await openDatabase();

  try {
    await db.runAsync("BEGIN TRANSACTION");

    // Fetch existing records to determine if an incoming item is an insert or update
    const placeholders = qrDataArray.map(() => "?").join(",");
    const existingRecords = await db.getAllAsync<{
      id: string;
      updated: string;
      // It might be beneficial to also fetch is_synced here if you have
      // more complex logic, but for now, 'updated' is the primary driver
      // for deciding if an update should happen.
    }>(
      `SELECT id, updated FROM qrcodes WHERE id IN (${placeholders})`,
      ...qrDataArray.map((qr) => qr.id)
    );
    const existingRecordMap = new Map(
      existingRecords.map((rec) => [rec.id, rec.updated])
    );

    const recordsToInsert: QRRecord[] = [];
    const recordsToUpdate: QRRecord[] = [];

    for (const qrData of qrDataArray) {
      const existingUpdatedTimestamp = existingRecordMap.get(qrData.id);
      if (existingUpdatedTimestamp) {
        // Record exists, check if incoming data is newer
        if (new Date(qrData.updated) > new Date(existingUpdatedTimestamp)) {
          recordsToUpdate.push(qrData);
        }
        // If incoming data is not newer, we can choose to ignore it or
        // handle it based on specific conflict resolution rules.
        // For now, we only update if newer.
      } else {
        // Record does not exist, it's an insert
        recordsToInsert.push(qrData);
      }
    }

    // Bulk insert new records.
    if (recordsToInsert.length > 0) {
      const insertPlaceholders = recordsToInsert
        .map(() => "(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)")
        .join(", ");
      const insertValues: any[] = recordsToInsert.flatMap((qrData) => [
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
        qrData.is_synced ? 1 : 0, // MODIFIED: Honor incoming is_synced status
      ]);
      await db.runAsync(
        `INSERT INTO qrcodes
        (id, qr_index, user_id, code, metadata, metadata_type, account_name,
         account_number, type, created, updated, is_deleted, is_synced)
         VALUES ${insertPlaceholders}`,
        insertValues
      );
    }

    // Bulk update modified records.
    // Consider batching these updates if recordsToUpdate can be very large.
    // For simplicity, a loop is used here.
    for (const qrData of recordsToUpdate) {
      await db.runAsync(
        `UPDATE qrcodes
         SET qr_index = ?, code = ?, metadata = ?, metadata_type = ?,
         account_name = ?, account_number = ?, type = ?, updated = ?,
         is_deleted = ?, is_synced = ?
         WHERE id = ?`,
        [
          qrData.qr_index,
          qrData.code,
          qrData.metadata,
          qrData.metadata_type,
          qrData.account_name || "",
          qrData.account_number || "",
          qrData.type,
          qrData.updated,
          qrData.is_deleted ? 1 : 0,
          qrData.is_synced ? 1 : 0, // MODIFIED: Honor incoming is_synced status
          qrData.id,
        ]
      );
    }

    await db.runAsync("COMMIT");
  } catch (error) {
    await db.runAsync("ROLLBACK");
    console.error("Failed to insert/update QR codes:", error);
    // Optionally re-throw the error if the caller needs to handle it
    // throw error;
  }
}
/**
 * Search QR codes using a dynamic query that includes the
 * search term across multiple fields.
 */
export async function searchQrCodes(userId: string, searchQuery: string = "") {
  const db = await openDatabase();
  try {
    const queryParams: any[] = [userId];
    const conditions: string[] = ["user_id = ? AND is_deleted = 0"];
    if (searchQuery) {
      const matchingCodes = returnItems(searchQuery);
      const searchTerms = Array.from(new Set([searchQuery, ...matchingCodes]));
      const searchConditions = searchTerms.flatMap((term) =>
        ["code", "metadata", "account_name", "account_number"].map((field) => {
          queryParams.push(`%${term}%`);
          return `${field} LIKE ?`;
        })
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
    console.error("Error searching QR codes:", error);
    return [];
  }
}

/**
 * Filter QR codes by type.
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
    console.error("Error filtering QR codes by type:", error);
    return [];
  }
}

/**
 * Update the qr_index values and the updated timestamp for an array of QR codes.
 * This function uses a single SQL query with a CASE statement to update all records.
 */
export async function updateQrIndexes(qrDataArray: QRRecord[]): Promise<void> {
  if (!qrDataArray.length) return;
  const db = await openDatabase();
  const updatedAt = new Date().toISOString();

  try {
    const cases = qrDataArray.map(() => "WHEN ? THEN ?").join(" ");
    const ids = qrDataArray.map((qr) => qr.id);
    const query = `
      UPDATE qrcodes
      SET qr_index = CASE id ${cases} END,
          updated = ?,
          is_synced = 0
      WHERE id IN (${ids.map(() => "?").join(",")})
    `;
    // Build parameters: for each record, add id and its new index.
    const params: any[] = [];
    qrDataArray.forEach((qr) => {
      params.push(qr.id, qr.qr_index);
    });
    // Then add the common updated timestamp and all IDs for the IN clause.
    params.push(updatedAt, ...ids);
    await db.runAsync(query, ...params);
  } catch (error) {
    console.error("Failed to update QR indexes and timestamps:", error);
  }
}

/**
 * Get the next available QR index for a user.
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
    console.error("Error getting next QR index:", error);
    return 0;
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
    console.error("Error closing the database:", error);
  }
}
