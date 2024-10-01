import pb from "@/services/pocketBase"; // Assuming you have PocketBase setup
import { openDatabase } from '../userDB';
import QRRecord from '@/types/qrType';
import { returnItemCode } from '@/utils/returnItemData';


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
    // Get all unsynced local QR codes
    const unsyncedQrCodes = await getUnsyncedQrCodes(userId);

    if (unsyncedQrCodes.length === 0) {
      console.log('No unsynced QR codes to sync for this user');
      return;
    }

    // Construct the filter expression using logical OR
    const filterExpression = unsyncedQrCodes
      .map(qr => `id='${qr.id}'`)
      .join(' || ');

    // Fetch existing records from the server in bulk
    const serverRecords = await pb.collection('qr').getFullList({
      filter: filterExpression,
      // fields: 'id,updated',
    });

    const serverRecordMap = new Map(serverRecords.map(rec => [rec.id, rec.updated]));

    const recordsToCreate = [];
    const recordsToUpdate = [];

    for (const qrCode of unsyncedQrCodes) {
      const serverUpdated = serverRecordMap.get(qrCode.id);

      if (serverUpdated) {
        if (new Date(qrCode.updated) > new Date(serverUpdated)) {
          recordsToUpdate.push({ id: qrCode.id, data: qrCode });
        }
      } else {
        recordsToCreate.push(qrCode);
      }
    }

    // Batch create
    if (recordsToCreate.length > 0) {
      await pb.collection('qr').create(recordsToCreate);
      console.log('Batch create completed');
    }

    // Batch update
    for (const { id, data } of recordsToUpdate) {
      await pb.collection('qr').update(id, data);
    }

    // Mark all QR codes as synced in the local database
    await db.runAsync(
      'UPDATE qrcodes SET is_synced = 1 WHERE id IN (' +
        unsyncedQrCodes.map(() => '?').join(',') +
        ')',
      ...unsyncedQrCodes.map(qr => qr.id)
    );

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
      console.log('Insert/Update operation completed successfully');
  } catch (error) {
      await db.runAsync('ROLLBACK');
      console.error('Failed to insert/update QR codes:', error);
  }
}
// // Function to filter QR codes using searchQuery and filter
// export async function filterQrCodes(userId: string, searchQuery: string = '', filter: string = 'all') {
//     const db = await openDatabase();
//     try {
//         // Construct SQL query with filtering based on `searchQuery` and `filter`
//         let query = 'SELECT * FROM qrcodes WHERE user_id = ? AND is_deleted = 0';
//         const queryParams: any[] = [userId];

//         // Add searchQuery filtering
//         if (searchQuery) {
//             query += ' AND (code LIKE ? OR metadata LIKE ? OR account_name LIKE ? OR account_number LIKE ?)';
//             const searchPattern = `%${searchQuery}%`;
//             queryParams.push(searchPattern, searchPattern, searchPattern, searchPattern);
//         }

//         // Add type filter
//         if (filter !== 'all') {
//             query += ' AND type = ?';
//             queryParams.push(filter);
//         }

//         // Add ordering
//         query += ' ORDER BY qr_index';

//         return await db.getAllAsync<QRRecord>(query, ...queryParams);
//     } catch (error) {
//         console.error('Error filtering QR codes:', error);
//         return [];
//     }
// }
export async function filterQrCodes(
    userId: string,
    searchQuery: string = '',
    filter: string = 'all'
  ) {
    const db = await openDatabase();
    try {
      let query =
        'SELECT * FROM qrcodes WHERE user_id = ? AND is_deleted = 0';
      const queryParams: any[] = [userId];
  
      if (searchQuery) {
        // Get matching codes from returnItemCode
        const matchingCodes = returnItemCode(searchQuery);
        console.log('Matching codes:', matchingCodes);
  
        let searchConditions = [];
  
        // Include matching codes in the SQL query for 'code' field
        if (matchingCodes.length > 0) {
          const placeholders = matchingCodes.map(() => '?').join(', ');
          searchConditions.push(`code IN (${placeholders})`);
          queryParams.push(...matchingCodes);
        }
  
        // Include 'searchQuery' and 'matchingCodes' in other fields
        const searchPatterns = [
          `%${searchQuery}%`,
          ...matchingCodes.map(code => `%${code}%`)
        ];
  
        const fieldsToSearch = [
          'code',
          'metadata',
          'account_name',
          'account_number'
        ];
  
        // Build search conditions
        fieldsToSearch.forEach(field => {
          searchPatterns.forEach(pattern => {
            searchConditions.push(`${field} LIKE ?`);
            queryParams.push(pattern);
          });
        });
  
        // Combine conditions
        if (searchConditions.length > 0) {
          query += ' AND (' + searchConditions.join(' OR ') + ')';
        }
      }
  
      // Add type filter if specified
      if (filter !== 'all') {
        query += ' AND type = ?';
        queryParams.push(filter);
      }
  
      // Order by qr_index
      query += ' ORDER BY qr_index';
  
      // Execute the query
      return await db.getAllAsync<QRRecord>(query, ...queryParams);
    } catch (error) {
      console.error('Error filtering QR codes:', error);
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