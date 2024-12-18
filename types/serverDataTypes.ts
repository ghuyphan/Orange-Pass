import QRRecord from '@/types/qrType'; // Import QRRecord

interface ServerRecord extends QRRecord {
  id: string;
  created: string;
  updated: string;
  collectionId: string;
  collectionName: string;
} 
export default ServerRecord