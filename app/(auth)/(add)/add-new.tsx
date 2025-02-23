import React, { useCallback, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { router, useLocalSearchParams } from 'expo-router';
import { FormikHelpers } from 'formik';
import QRForm, { FormParams, CategoryItem, BrandItem, MetadataTypeItem } from '@/components/forms/QRForm';
import { addQrData } from '@/store/reducers/qrSlice';
import { RootState } from '@/store/rootReducer';
import { generateUniqueId } from '@/utils/uniqueId';
import QRRecord from '@/types/qrType';
import { getNextQrIndex, insertOrUpdateQrCodes } from '@/services/localDB/qrDB';
import { returnItemCodeByBin, returnItemData } from '@/utils/returnItemData';
import { useLocale } from '@/context/LocaleContext';
import { t } from '@/i18n';
import { removeQrData } from '@/store/reducers/qrSlice';

const AddScreen: React.FC = () => {
  const dispatch = useDispatch();
  const userId = useSelector((state: RootState) => state.auth.user?.id ?? '');
  const { locale: currentLocale = 'en' } = useLocale(); // Default to 'en' if undefined
  const { codeFormat, codeValue, codeBin, codeType, codeProvider } = useLocalSearchParams<{
    codeFormat?: string;
    codeValue?: string;
    codeBin?: string;
    codeType?: string;
    codeProvider?: string;
  }>();

  const onNavigateBack = useCallback(() => router.back(), []);

  // Memoized category map
  const categoryMap = useMemo(
    () => ({
      bank: { display: t('addScreen.bankCategory'), value: 'bank' },
      ewallet: { display: t('addScreen.ewalletCategory'), value: 'ewallet' },
      store: { display: t('addScreen.storeCategory'), value: 'store' },
    }),
    [t]
  );

  // Memoized metadata type data
  const metadataTypeData: MetadataTypeItem[] = useMemo(
    () => [
      { display: t('addScreen.qr'), value: 'qr' },
      { display: t('addScreen.barcode'), value: 'barcode' },
    ],
    [t]
  );

  // Optimized item data helper with caching
  const getItemDataHelper = useCallback(
    (itemCode: string): BrandItem | null => {
      const itemData = returnItemData(itemCode);
      if (!itemData || !['bank', 'store', 'ewallet'].includes(itemData.type)) {
        return null;
      }

      return {
        code: itemCode,
        name: itemData.name,
        full_name: itemData.full_name[currentLocale],
        type: itemData.type as 'bank' | 'store' | 'ewallet', // Type assertion after validation
      };
    },
    [currentLocale]
  );

  // Memoized item code derivation
  const itemCode = useMemo(() => {
    const effectiveCodeProvider = codeProvider || returnItemCodeByBin(codeBin || '');
    return effectiveCodeProvider;
  }, [codeBin, codeProvider]);

  // Optimized initial values calculation
  const initialValues: FormParams = useMemo(() => {
    const categoryKey = codeType as keyof typeof categoryMap;
    const category = categoryKey ? categoryMap[categoryKey] : null;
    const brand = itemCode ? getItemDataHelper(itemCode) : null;

    let metadataType: MetadataTypeItem = metadataTypeData[0]; // Default value
    if (codeFormat === '256') {
      metadataType = metadataTypeData.find((item) => item.value === 'qr') || metadataTypeData[0];
    } else if (codeFormat === '1') {
      metadataType = metadataTypeData.find((item) => item.value === 'barcode') || metadataTypeData[0];
    }
    return {
      metadataType,
      category: category as CategoryItem, // Type assertion after validation
      brand,
      metadata: codeValue || '',
      accountName: '',
      accountNumber: '',
    };
  }, [codeType, itemCode, codeValue, codeFormat, categoryMap, metadataTypeData, getItemDataHelper]);



  // Optimized submit handler
  const handleFormSubmit = useCallback(
    async (values: FormParams, formikHelpers: FormikHelpers<FormParams>) => {
      formikHelpers.setSubmitting(true); // Start loading state early
      const newId = generateUniqueId();
      const now = new Date().toISOString();

      try {
        const nextIndex = await getNextQrIndex(userId);

        const newQrRecord: QRRecord = {
          id: newId,
          qr_index: nextIndex,
          user_id: userId,
          code: values.brand?.code || '', // Fallback to empty string
          metadata: values.metadata,
          metadata_type: values.metadataType?.value || 'qr', // Fallback to 'qr'
          account_name: values.accountName,
          account_number: values.accountNumber,
          type: values.category?.value || 'store',  // Fallback to 'store'
          created: now,
          updated: now,
          is_deleted: false,
          is_synced: false,
        };

        dispatch(addQrData(newQrRecord));
        await insertOrUpdateQrCodes([newQrRecord]);
        router.replace('/(auth)/home'); // Navigate on success
      } catch (error) {
        console.error('Submission error:', error);
        dispatch(removeQrData(newId)); //remove if error
        // Consider using a toast or other UI feedback instead of console.error
      } finally {
        formikHelpers.setSubmitting(false); // Ensure loading state is reset
      }
    },
    [dispatch, userId]
  );

  return (
    <QRForm
      initialValues={initialValues}
      onSubmit={handleFormSubmit}
      isEditing={false}
      onNavigateBack={onNavigateBack}
      codeProvider={codeProvider}
    />
  );
};

export default React.memo(AddScreen);