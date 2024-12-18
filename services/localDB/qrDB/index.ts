import pb from "@/services/pocketBase";
import { openDatabase } from '../userDB';
import QRRecord from '@/types/qrType';
import ServerRecord from "@/types/serverDataTypes";
import { returnItemCode } from '@/utils/returnItemData';
  
export async function createQrTable() {
    const db = await openDatabase();
    try {
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

        // Adding indexes for frequently queried fields to improve performance
        await db.execAsync('CREATE INDEX IF NOT EXISTS idx_qr_user_id ON qrcodes(user_id);');
        await db.execAsync('CREATE INDEX IF NOT EXISTS idx_qr_is_deleted ON qrcodes(is_deleted);');
        await db.execAsync('CREATE INDEX IF NOT EXISTS idx_qr_index ON qrcodes(qr_index);');

    } catch (error) {
        console.error('Error creating qr table or indexes:', error);
    }
}
export async function getQrCodeById(id: string) {
    const db = await openDatabase();
    try {
        return await db.getFirstAsync<QRRecord>('SELECT * FROM qrcodes WHERE id = ? AND is_deleted = 0', id);
    } catch (error) {
        console.error('Error retrieving QR code by ID:', error);
        return null;
    }
}

// Retrieve QR codes by user ID with optimized query
export async function getQrCodesByUserId(userId: string) {
    const db = await openDatabase();
    try {
        return await db.getAllAsync<QRRecord>('SELECT * FROM qrcodes WHERE user_id = ? AND is_deleted = 0 ORDER BY qr_index', userId);
    } catch (error) {
        console.error('Error retrieving QR codes by user ID:', error);
        return [];
    }
}

// Optimized delete function to mark as deleted
export async function deleteQrCode(id: string) {
    const db = await openDatabase();
    const updatedAt = new Date().toISOString(); // Get the current timestamp in ISO format

    try {
        // Mark the QR code as deleted and update the timestamp
        await db.runAsync(
            'UPDATE qrcodes SET is_deleted = 1, is_synced = 0, updated = ? WHERE id = ?',
            updatedAt, id
        );
    } catch (error) {
        console.error(`Failed to delete QR code ${id}:`, error);
    }
}

// Optimized bulk insert with transaction handling
export async function insertQrCodesBulk(qrDataArray: QRRecord[]): Promise<void> {
    const db = await openDatabase();
    const placeholders = qrDataArray.map(() => '(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').join(', ');
    const values: any[] = [];

    qrDataArray.forEach((qrData) => {
        values.push(
            qrData.id,
            qrData.qr_index,
            qrData.user_id,
            qrData.code,
            qrData.metadata,
            qrData.metadata_type,
            qrData.account_name || '',
            qrData.account_number || '',
            qrData.type,
            qrData.created,
            qrData.updated,
            qrData.is_deleted ? 1 : 0,
            qrData.is_synced ? 1 : 0
        );
    });

    try {
        await db.runAsync('BEGIN TRANSACTION');
        await db.runAsync(`
            INSERT OR IGNORE INTO qrcodes 
            (id, qr_index, user_id, code, metadata, metadata_type, account_name, account_number, type, created, updated, is_deleted, is_synced) 
            VALUES ${placeholders}
        `, values);
        await db.runAsync('COMMIT');
    } catch (error) {
        await db.runAsync('ROLLBACK');
        console.error('Failed to insert bulk QR codes:', error);
    }
}
export async function syncQrCodes(userId: string) {
    const db = await openDatabase();

    try {
        // 1. Get all unsynced local QR codes (including deleted ones)
        const unsyncedQrCodes = await getUnsyncedQrCodes(userId);

        // 2. Separate locally deleted QR codes
        const locallyDeletedQrCodes = unsyncedQrCodes.filter(qr => qr.is_deleted);
        const locallyModifiedQrCodes = unsyncedQrCodes.filter(qr => !qr.is_deleted);

        // 3. Handle deletions on the server (if any)
        if (locallyDeletedQrCodes.length > 0) {
            const deletePromises = locallyDeletedQrCodes.map(qr =>
                pb.collection('qr').delete(qr.id)
            );
            await Promise.all(deletePromises);
        }

        // 4. Construct filter for modified QR codes
        const filterExpression = locallyModifiedQrCodes
            .map(qr => `id='${qr.id}'`)
            .join(' || ');

        // 5. Fetch server records for modified QR codes (if any)
        let serverRecords: ServerRecord[] = []; 
        if (filterExpression) {
            serverRecords = await pb.collection('qr').getFullList({
                filter: filterExpression,
                fields: 'id,updated',
            });
        }

        const serverRecordMap = new Map(serverRecords.map(rec => [rec.id, rec.updated]));

        // 6. Determine records to create/update
        const recordsToCreate = [];
        const recordsToUpdate = [];
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

        // 7. Perform batch create/update
        if (recordsToCreate.length > 0) {
            await Promise.all(recordsToCreate.map(record => pb.collection('qr').create(record)));
        }
        if (recordsToUpdate.length > 0) {
            await Promise.all(recordsToUpdate.map(({ id, data }) => pb.collection('qr').update(id, data)));
        }

        // 8. Mark all unsynced QR codes as synced (including deleted ones)
        const idsToUpdate = unsyncedQrCodes.map(qr => qr.id);
        if (idsToUpdate.length > 0) {
            await db.runAsync(
                `UPDATE qrcodes SET is_synced = 1 WHERE id IN (${idsToUpdate.map(() => '?').join(',')})`,
                ...idsToUpdate
            );
        }
    } catch (error) {
        console.error('Error during sync:', error);
        throw error; // Re-throw for caller to handle
    }
}

export async function getUnsyncedQrCodes(userId: string) {
    const db = await openDatabase();
    try {
        return await db.getAllAsync<QRRecord>(
            'SELECT * FROM qrcodes WHERE is_synced = 0 AND user_id = ?',
            userId
        );
    } catch (error) {
        console.error('Error retrieving unsynced QR codes:', error);
        return [];
    }
}

export async function getLocallyDeletedQrCodes(userId: string) {
    const db = await openDatabase();
    try {
        return await db.getAllAsync<QRRecord>('SELECT id FROM qrcodes WHERE user_id = ? AND is_deleted = 1', userId);
    } catch (error) {
        console.error('Error retrieving locally deleted QR codes:', error);
        return [];
    }
}

export async function fetchServerData(userId: string) {
    try {
        // 1. Get locally deleted QR code IDs
        const locallyDeletedQrCodes = await getLocallyDeletedQrCodes(userId);
        const deletedIds = locallyDeletedQrCodes.map(item => item.id);

        // 2. Get the latest updated timestamp from local data
        const db = await openDatabase();
        const latestLocalUpdateResult = await db.getFirstAsync<{ updated: string }>(
            'SELECT MAX(updated) as updated FROM qrcodes WHERE user_id = ?',
            userId
        );
        const latestLocalUpdate = latestLocalUpdateResult?.updated || null;

        // 3. Construct filter to exclude deleted items and filter by timestamp
        let filter = `user_id = '${userId}'`;
        if (deletedIds.length > 0) {
            filter += ` && id != '${deletedIds.join("' && id != '")}'`;
        }
        if (latestLocalUpdate) {
            filter += ` && updated > '${latestLocalUpdate}'`;
        }

        // 4. Fetch data from the server with the combined filter
        const serverData = await pb.collection('qr').getList(1, 30, {
            filter,
            sort: 'updated', // Sort by updated to get the latest changes
        });

        return serverData.items;
    } catch (error) {
        console.error('Error fetching server data:', error);
        throw error;
    }
}

// Function to insert or update QR codes based on their existence in the local DB
export async function insertOrUpdateQrCodes(qrDataArray: QRRecord[]): Promise<void> {
    const db = await openDatabase();

    try {
        // Begin transaction
        await db.runAsync('BEGIN TRANSACTION');
        // Fetch existing IDs in bulk
        const existingRecords = await db.getAllAsync<{ id: string; updated: string }>(
            `SELECT id, updated FROM qrcodes WHERE id IN (${qrDataArray.map(() => '?').join(',')})`,
            ...qrDataArray.map(qr => qr.id)
        );
        const existingRecordMap = new Map(existingRecords.map(rec => [rec.id, rec.updated]));

        // Prepare arrays for bulk insert and update
        const recordsToInsert: QRRecord[] = [];
        const recordsToUpdate: QRRecord[] = [];

        for (const qrData of qrDataArray) {
            const existingUpdated = existingRecordMap.get(qrData.id);
            if (existingUpdated) {
                if (new Date(qrData.updated) > new Date(existingUpdated)) {
                    recordsToUpdate.push(qrData);
                }
            } else {
                recordsToInsert.push(qrData);
            }
        }

        // Bulk insert
        if (recordsToInsert.length > 0) {
            const placeholders = recordsToInsert.map(() => '(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').join(', ');
            const values = recordsToInsert.flatMap(qrData => [
                qrData.id,
                qrData.qr_index,
                qrData.user_id,
                qrData.code,
                qrData.metadata,
                qrData.metadata_type,
                qrData.account_name || '',
                qrData.account_number || '',
                qrData.type,
                qrData.created,
                qrData.updated,
                qrData.is_deleted ? 1 : 0,
                qrData.is_synced ? 1 : 0,
            ]);

            await db.runAsync(
                `INSERT INTO qrcodes 
              (id, qr_index, user_id, code, metadata, metadata_type, account_name, account_number, type, created, updated, is_deleted, is_synced) 
              VALUES ${placeholders}`,
                values
            );
        }

        // Bulk update
        for (const qrData of recordsToUpdate) {
            await db.runAsync(
                `UPDATE qrcodes 
              SET qr_index = ?, code = ?, metadata = ?, metadata_type = ?, account_name = ?, account_number = ?, type = ?, updated = ?, is_synced = ?, is_deleted = ?
              WHERE id = ?`,
                qrData.qr_index,
                qrData.code,
                qrData.metadata,
                qrData.metadata_type,
                qrData.account_name || '',
                qrData.account_number || '',
                qrData.type,
                qrData.updated,
                qrData.is_synced ? 1 : 0,
                qrData.is_deleted ? 1 : 0,
                qrData.id
            );
        }

        // Commit transaction
        await db.runAsync('COMMIT');
    } catch (error) {
        await db.runAsync('ROLLBACK');
        console.error('Failed to insert/update QR codes:', error);
    }
}
export async function searchQrCodes(
    userId: string,
    searchQuery: string = ''
) {
    const db = await openDatabase();
    try {
        const queryParams: any[] = [userId];
        const conditions: string[] = [`user_id = ? AND is_deleted = 0`];

        if (searchQuery) {
            const matchingCodes = returnItemCode(searchQuery);
            const searchTerms = Array.from(new Set([searchQuery, ...matchingCodes]));

            const searchConditions = searchTerms.flatMap(term =>
                ['code', 'metadata', 'account_name', 'account_number'].map(field => {
                    queryParams.push(`%${term}%`);
                    return `${field} LIKE ?`;
                })
            );

            conditions.push(`(${searchConditions.join(' OR ')})`);
        }

        const query = `
      SELECT * FROM qrcodes 
      WHERE ${conditions.join(' AND ')} 
      ORDER BY qr_index
    `;

        return await db.getAllAsync<QRRecord>(query, ...queryParams);
    } catch (error) {
        console.error('Error searching QR codes:', error);
        return [];
    }
}

export async function filterQrCodesByType(
    userId: string,
    filter: string = 'all'
) {
    const db = await openDatabase();
    try {
        const queryParams: any[] = [userId];
        const conditions: string[] = [`user_id = ? AND is_deleted = 0`];

        if (filter !== 'all') {
            conditions.push('type = ?');
            queryParams.push(filter);
        }

        const query = `
      SELECT * FROM qrcodes 
      WHERE ${conditions.join(' AND ')} 
      ORDER BY qr_index
    `;

        return await db.getAllAsync<QRRecord>(query, ...queryParams);
    } catch (error) {
        console.error('Error filtering QR codes by type:', error);
        return [];
    }
}

// Function to update the qr_index and updated timestamp of QR codes in bulk
export async function updateQrIndexes(qrDataArray: QRRecord[]): Promise<void> {
    const db = await openDatabase();
    const updatedAt = new Date().toISOString();

    try {
        await db.runAsync('BEGIN TRANSACTION');

        const ids = qrDataArray.map(qr => qr.id);
        const qrIndexCases = qrDataArray.map(qr => `WHEN '${qr.id}' THEN ${qr.qr_index}`).join(' ');
        const updatedAtCases = qrDataArray.map(qr => `WHEN '${qr.id}' THEN '${updatedAt}'`).join(' ');

        const query = `
          UPDATE qrcodes
          SET
              qr_index = CASE id ${qrIndexCases} END,
              updated = CASE id ${updatedAtCases} END,
              is_synced = 0
          WHERE id IN (${ids.map(() => '?').join(',')})
      `;

        await db.runAsync(query, ...ids);

        await db.runAsync('COMMIT');
    } catch (error) {
        await db.runAsync('ROLLBACK');
        console.error('Failed to update QR indexes and timestamps:', error);
    }
}


// Function to close the database
export async function closeDatabase() {
    const db = await openDatabase();
    try {
        await db.closeAsync();
    } catch (error) {
        console.error('Error closing the database:', error);
    }
}