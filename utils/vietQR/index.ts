import axios from 'axios';

export const getVietQRData = async (
  accountNo: string,
  accountName: string,
  acqId: string,
  amount?: number,
  addInfo?: string // Make addInfo optional
) => {
  const vietQRUrl = process.env.EXPO_PUBLIC_VIETQR_API_URL_GENERATE || 'default_url';
  const vietQRClientSecret = process.env.EXPO_PUBLIC_VIETQR_API_CLIENT_SECRET;
  const vietQRClientId = process.env.EXPO_PUBLIC_VIETQR_API_CLIENT_ID;

  try {
    const response = await axios.post(
      vietQRUrl,
      {
        accountNo: accountNo,
        accountName: accountName,
        acqId: acqId,
        amount: amount,
        addInfo: addInfo || `chuyen tien toi ${accountName}`, // Set default value if addInfo is empty
        template: 'compact',
      },
      {
        headers: {
          'x-client-id': vietQRClientId,
          'x-api-key': vietQRClientSecret,
          'Content-Type': 'application/json',
        },
      }
    );

    return response.data;

    // Rest of your code
  } catch (error) {
    console.error('Error generating VietQR:', error);
  }
};
