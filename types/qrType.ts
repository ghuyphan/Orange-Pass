interface QRRecord {
    id: string;
    qr_index: number;
    user_id: string;
    code: string;
    metadata: string;
    metadata_type: "qr" | "barcode";
    account_name: string;
    account_number: string;
    type: "bank" | "store" | "ewallet";
    created: string;
    updated: string;
    is_synced: boolean;
    is_deleted: boolean;
}
export default QRRecord