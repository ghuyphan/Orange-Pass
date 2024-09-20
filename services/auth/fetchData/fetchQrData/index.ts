import pb from "@/services/pocketBase";
import QRRecord from "@/types/qrType";

export const fetchQrData = async (userId: string, page: number = 1, limit: number = 50) => {
    const qrCode = await pb.collection('qr').getList<QRRecord>(page, limit, {
            filter: `user_id = "${userId}"`,
    })
    return qrCode;
}