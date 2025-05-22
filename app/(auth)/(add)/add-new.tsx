import React, { useCallback, useMemo, useState } from 'react'; // Added useState
import { useDispatch, useSelector } from 'react-redux';
import { router, useLocalSearchParams } from 'expo-router';
import { FormikHelpers } from 'formik';
import QRForm, {
  FormParams,
  CategoryItem,
  BrandItem,
  MetadataTypeItem,
} from '@/components/forms/QRForm';
import { addQrData, removeQrData } from '@/store/reducers/qrSlice'; // Combined imports
import { RootState } from '@/store/rootReducer';
import { generateUniqueId } from '@/utils/uniqueId';
import QRRecord from '@/types/qrType';
import { getNextQrIndex, insertOrUpdateQrCodes } from '@/services/localDB/qrDB';
import { returnItemCodeByBin, returnItemData } from '@/utils/returnItemData';
import { useLocale } from '@/context/LocaleContext';
import { t } from '@/i18n';
import { getVietQRData } from '@/utils/vietQR';

const AddScreen: React.FC = () => {
  const dispatch = useDispatch();
  const userId = useSelector((state: RootState) => state.auth.user?.id ?? '');
  const { locale: currentLocale = 'en' } = useLocale();
  const { codeFormat, codeValue, codeBin, codeType, codeProvider } =
    useLocalSearchParams<{
      codeFormat?: string;
      codeValue?: string;
      codeBin?: string;
      codeType?: string;
      codeProvider?: string;
    }>();

  // State for VietQR API loading, to be passed to the input
  const [isVietQrLoading, setIsVietQrLoading] = useState(false);

  const onNavigateBack = useCallback(() => router.back(), []);

  const categoryMap = useMemo(
    () => ({
      bank: { display: t('addScreen.bankCategory'), value: 'bank' },
      ewallet: { display: t('addScreen.ewalletCategory'), value: 'ewallet' },
      store: { display: t('addScreen.storeCategory'), value: 'store' },
    }),
    [] // t is stable if i18n setup is correct, or add t if it changes
  );

  const metadataTypeData: MetadataTypeItem[] = useMemo(
    () => [
      { display: t('addScreen.qr'), value: 'qr' },
      { display: t('addScreen.barcode'), value: 'barcode' },
    ],
    [] // t is stable
  );

  const getItemDataHelper = useCallback(
    (itemCode: string): BrandItem | null => {
      const itemData = returnItemData(itemCode);
      if (!itemData || !['bank', 'store', 'ewallet'].includes(itemData.type)) {
        return null;
      }
      return {
        code: itemCode,
        name: itemData.name,
        full_name: itemData.full_name[currentLocale] || itemData.name, // Fallback for full_name
        type: itemData.type as 'bank' | 'store' | 'ewallet',
        bin: itemData.bin, // Assuming BrandItem can have a bin
      };
    },
    [currentLocale]
  );

  const itemCode = useMemo(() => {
    return codeProvider || returnItemCodeByBin(codeBin || '');
  }, [codeBin, codeProvider]);

  const initialValues: FormParams = useMemo(() => {
    const categoryKey = codeType as keyof typeof categoryMap;
    const category = categoryKey ? categoryMap[categoryKey] : null;
    const brand = itemCode ? getItemDataHelper(itemCode) : null;

    let metadataType: MetadataTypeItem = metadataTypeData[0];
    if (codeFormat === '256') {
      // Assuming '256' maps to QR
      metadataType =
        metadataTypeData.find((item) => item.value === 'qr') ||
        metadataTypeData[0];
    } else if (codeFormat === '1') {
      // Assuming '1' maps to Barcode
      metadataType =
        metadataTypeData.find((item) => item.value === 'barcode') ||
        metadataTypeData[0];
    }

    return {
      metadataType,
      category: category as CategoryItem,
      brand,
      metadata: codeValue || '',
      accountName: '',
      accountNumber: '',
    };
  }, [
    codeType,
    itemCode,
    codeValue,
    codeFormat,
    categoryMap,
    metadataTypeData,
    getItemDataHelper,
  ]);

  const handleFormSubmit = useCallback(
    async (values: FormParams, formikHelpers: FormikHelpers<FormParams>) => {
      formikHelpers.setSubmitting(true); // Indicates overall form submission process
      const newId = generateUniqueId();
      const now = new Date().toISOString();
      let metadataToSave = values.metadata;

      try {
        // If it's a bank category and we have the necessary info for VietQR
        if (
          values.category?.value === 'bank' &&
          values.brand?.bin && // Ensure brand and bin are available
          values.accountNumber // Ensure accountNumber is provided
        ) {
          setIsVietQrLoading(true); // Start loading for the specific input
          try {
            const response = await getVietQRData(
              values.accountNumber, // Already checked it's not null/empty
              values.accountName ?? '', // accountName can be optional for the API
              values.brand.bin,
              0, // Assuming amount is 0 or not needed for QR generation here
              '' // Assuming description is not needed
            );
            if (response && response.data && response.data.qrCode) {
              metadataToSave = response.data.qrCode;
            } else {
              // Handle case where VietQR response is not as expected
              console.warn('VietQR response did not contain qrCode:', response);
              // Optionally, set a field error in Formik
              formikHelpers.setFieldError(
                'metadata',
                t('addScreen.vietQrGenerationError')
              );
              // throw new Error(t('addScreen.vietQrGenerationError')); // Or throw to stop submission
            }
          } catch (apiError) {
            console.error('VietQR API error:', apiError);
            formikHelpers.setFieldError(
              'metadata',
              t('addScreen.vietQrApiError')
            );
            // throw apiError; // Rethrow to be caught by the outer catch block and stop submission
            // For now, we'll let it proceed but with an error message on the field.
            // If you want to stop submission, uncomment the throw.
          } finally {
            setIsVietQrLoading(false); // Stop loading for the specific input
          }
        }

        const nextIndex = await getNextQrIndex(userId);
        const newQrRecord: QRRecord = {
          id: newId,
          qr_index: nextIndex,
          user_id: userId,
          code: values.brand?.code || '',
          metadata: metadataToSave, // Use the potentially updated metadata
          metadata_type: values.metadataType?.value || 'qr',
          account_name: values.accountName,
          account_number: values.accountNumber,
          type: values.category?.value || 'store',
          created: now,
          updated: now,
          is_deleted: false,
          is_synced: false,
        };

        dispatch(addQrData(newQrRecord));
        await insertOrUpdateQrCodes([newQrRecord]);

        // The short delay previously here might not be needed if the input's
        // loading shimmer provides sufficient immediate feedback.
        // await new Promise(resolve => setTimeout(resolve, 300));

        router.replace('/(auth)/home');
        // setSubmitting(false) is often not needed if the component unmounts after navigation
      } catch (error) {
        console.error('Submission error:', error);
        dispatch(removeQrData(newId)); // Rollback Redux state
        // Ensure VietQR loading is also false if an error occurred during its process
        // and wasn't reset by its own finally block (though it should be).
        if (isVietQrLoading) {
          setIsVietQrLoading(false);
        }
        formikHelpers.setSubmitting(false); // Set submitting to false on any error
      }
    },
    [dispatch, userId, isVietQrLoading, t] // Added isVietQrLoading and t
  );

  return (
    <QRForm
      initialValues={initialValues}
      onSubmit={handleFormSubmit}
      isEditing={false}
      onNavigateBack={onNavigateBack}
      codeProvider={codeProvider}
      isMetadataLoading={isVietQrLoading} // Pass the loading state to QRForm
    />
  );
};

export default React.memo(AddScreen);
