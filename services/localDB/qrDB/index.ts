import pb from "@/services/pocketBase"; // Assuming you have PocketBase setup
import { openDatabase } from '../userDB';
import QRRecord from '@/types/qrType';
import { getLocales } from 'expo-localization';
import enDatas from '@/assets/enDatas.json';
import viDatas from '@/assets/viDatas.json';

// Function to create the "qrcodes" table with optimized indexing
export async function createTable() {
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

        console.log('Table and indexes created successfully');
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
        console.log(`QR code ${id} marked as deleted and updated timestamp set`);
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
        console.log('Bulk QR codes inserted successfully');
    } catch (error) {
        await db.runAsync('ROLLBACK');
        console.error('Failed to insert bulk QR codes:', error);
    }
}
export async function syncQrCodes(userId: string) {
  const db = await openDatabase();

  try {
    // Get all unsynced local QR codes (is_synced = 0)
    const unsyncedQrCodes = await getUnsyncedQrCodes(userId);

    if (unsyncedQrCodes.length === 0) {
      console.log('No unsynced QR codes to sync for this user');
      return;
    }

    // Sync operations for each unsynced QR code in parallel
    const syncPromises = unsyncedQrCodes.map(async (qrCode) => {
      const data = {
        code: qrCode.code,
        qr_index: qrCode.qr_index,
        metadata: qrCode.metadata,
        type: qrCode.type,
        metadata_type: qrCode.metadata_type,
        account_name: qrCode.account_name,
        account_number: qrCode.account_number,
        userId: qrCode.user_id,
        is_deleted: qrCode.is_deleted,
      };

      try {
        // Check if the record exists on the server
        const existingRecord = await pb.collection('qr').getOne(qrCode.id).catch(() => null);

        if (existingRecord) {
          // Update if local record is newer
          if (new Date(qrCode.updated) > new Date(existingRecord.updated)) {
            const updatedRecord = await pb.collection('qr').update(qrCode.id, data);
            console.log(`QR code ${qrCode.id} updated on the server:`, updatedRecord);
          } else {
            console.log(`QR code ${qrCode.id} on the server is up-to-date, skipping update.`);
          }
        } else {
          // Create new record if it doesn't exist on the server
          await pb.collection('qr').create({ ...data, id: qrCode.id });
          console.log(`QR code ${qrCode.id} created on PocketBase`);
        }

        // Mark the QR code as synced in the local database
        await db.runAsync('UPDATE qrcodes SET is_synced = 1 WHERE id = ?', qrCode.id);
        console.log(`QR code ${qrCode.id} successfully synced and marked as synced.`);
      } catch (syncError) {
        console.error(`Failed to sync QR code ${qrCode.id}:`, syncError);
      }
    });

    // Wait for all sync operations to complete
    await Promise.allSettled(syncPromises);

    console.log('All unsynced QR codes for this user have been processed for syncing.');
  } catch (error) {
    console.error('Error during sync:', error);
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
// Function to retrieve locally deleted QR codes by user ID
export async function getLocallyDeletedQrCodes(userId: string) {
    const db = await openDatabase();
    try {
        return await db.getAllAsync<QRRecord>('SELECT * FROM qrcodes WHERE user_id = ? AND is_deleted = 1', userId);
    } catch (error) {
        console.error('Error retrieving locally deleted QR codes:', error);
        return [];
    }
}

// Function to insert or update QR codes based on their existence in the local DB
export async function insertOrUpdateQrCodes(qrDataArray: QRRecord[]): Promise<void> {
    const db = await openDatabase();

    try {
        await db.runAsync('BEGIN TRANSACTION');

        for (const qrData of qrDataArray) {
            // Check if the QR code already exists in the database
            const existingQr = await db.getFirstAsync<QRRecord>('SELECT * FROM qrcodes WHERE id = ?', qrData.id);

            if (existingQr) {
                // Update the record only if the server's data is newer
                if (new Date(qrData.updated) > new Date(existingQr.updated)) {
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
                    console.log(`QR code ${qrData.id} updated successfully`);
                }
            } else {
                // If the QR code doesn't exist, insert it
                await db.runAsync(
                    `INSERT INTO qrcodes 
            (id, qr_index, user_id, code, metadata, metadata_type, account_name, account_number, type, created, updated, is_deleted, is_synced) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
                console.log(`QR code ${qrData.id} inserted successfully`);
            }
        }

        await db.runAsync('COMMIT');
        console.log('Insert/Update operation completed successfully');
    } catch (error) {
        await db.runAsync('ROLLBACK');
        console.error('Failed to insert/update QR codes:', error);
    }
}
// Function to filter QR codes using searchQuery and filter
export async function filterQrCodes(userId: string, searchQuery: string = '', filter: string = 'all') {
    const db = await openDatabase();
    try {
        // Construct SQL query with filtering based on `searchQuery` and `filter`
        let query = 'SELECT * FROM qrcodes WHERE user_id = ? AND is_deleted = 0';
        const queryParams: any[] = [userId];

        // Add searchQuery filtering
        if (searchQuery) {
            query += ' AND (code LIKE ? OR metadata LIKE ? OR account_name LIKE ? OR account_number LIKE ?)';
            const searchPattern = `%${searchQuery}%`;
            queryParams.push(searchPattern, searchPattern, searchPattern, searchPattern);
        }

        // Add type filter
        if (filter !== 'all') {
            query += ' AND type = ?';
            queryParams.push(filter);
        }

        // Add ordering
        query += ' ORDER BY qr_index';

        return await db.getAllAsync<QRRecord>(query, ...queryParams);
    } catch (error) {
        console.error('Error filtering QR codes:', error);
        return [];
    }
}

// Function to update the qr_index and updated timestamp of QR codes in bulk
export async function updateQrIndexes(qrDataArray: QRRecord[]): Promise<void> {
    const db = await openDatabase();
    const updatedAt = new Date().toISOString(); // Current timestamp in ISO format
    
    try {
        await db.runAsync('BEGIN TRANSACTION');

        for (const qrData of qrDataArray) {
            await db.runAsync(
                'UPDATE qrcodes SET qr_index = ?, updated = ?, is_synced = 0 WHERE id = ?',
                qrData.qr_index,
                updatedAt,
                qrData.id
            );
        }

        await db.runAsync('COMMIT');
        console.log('QR indexes and timestamps updated successfully');
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
        console.log('Database closed');
    } catch (error) {
        console.error('Error closing the database:', error);
    }
}