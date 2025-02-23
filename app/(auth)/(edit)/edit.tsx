// EditScreen.tsx
import React, { useCallback, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { router, useLocalSearchParams } from 'expo-router';
import { FormikHelpers } from 'formik';
import QRForm from '@/components/forms/QRForm';
import { updateQrData } from '@/store/reducers/qrSlice';
import { RootState } from '@/store/rootReducer';
import QRRecord from '@/types/qrType';
import { insertOrUpdateQrCodes } from '@/services/localDB/qrDB';
import { t } from '@/i18n';
import { BrandItem, CategoryItem, FormParams, MetadataTypeItem } from '@/components/forms/QRForm';
import { returnItemData } from '@/utils/returnItemData';
import { View } from 'react-native';

const EditScreen: React.FC = () => {
  const dispatch = useDispatch();
  const { id } = useLocalSearchParams<{ id?: string }>();  // Get the ID
  const qrRecord = useSelector((state: RootState) => state.qr.qrData.find(record => record.id === id)); // Find the record

  // Memoized category map
  const categoryMap = useMemo(() => ({
    bank: { display: t('editScreen.bankCategory'), value: 'bank' },
    ewallet: { display: t('editScreen.ewalletCategory'), value: 'ewallet' },
    store: { display: t('editScreen.storeCategory'), value: 'store' },
  }), [t]);

  // Memoized metadata type data
  const metadataTypeData: MetadataTypeItem[] = useMemo(() => ([
    { display: t('editScreen.qr'), value: 'qr' },
    { display: t('editScreen.barcode'), value: 'barcode' },
  ]), [t]);

  // Memoized getItemDataHelper function
  const getItemDataHelper = useCallback((itemCode: string, locale: string): BrandItem | null => {
    const itemData = returnItemData(itemCode);
    if (!itemData || !['bank', 'store', 'ewallet'].includes(itemData.type)) {
      return null;
    }
    return {
      code: itemCode,
      name: itemData.name,
      full_name: itemData.full_name[locale],
      type: itemData.type as 'bank' | 'store' | 'ewallet', // Type assertion is safe due to the check above
    };
  }, []);

  // Memoized initial values.  Calculates ONLY when dependencies change.
  const initialValues = useMemo(() => {
    if (!qrRecord) {
      return {
        category: null,
        brand: null,
        metadataType: metadataTypeData[0],
        metadata: '',
        accountName: '',
        accountNumber: '',
      };
    }

    const categoryKey = qrRecord.type as keyof typeof categoryMap;
    const category = categoryMap[categoryKey] || null;  // Keep this
    const brand = qrRecord.code ? getItemDataHelper(qrRecord.code, 'en') : null;
    const metadataType = metadataTypeData.find(item => item.value === qrRecord.metadata_type) || metadataTypeData[0];

    return {
      category: category as CategoryItem | null, // Type assertion HERE
      brand,
      metadataType,
      metadata: qrRecord.metadata,
      accountName: qrRecord.account_name,
      accountNumber: qrRecord.account_number,
    };
  }, [qrRecord, categoryMap, metadataTypeData, getItemDataHelper]);


  // Memoized form submission handler.
  const handleFormSubmit = useCallback(async (values: FormParams, { setSubmitting }: FormikHelpers<FormParams>) => {
    if (!qrRecord) return;

    try {
      const updatedQrRecord: QRRecord = {
        ...qrRecord,
        code: values.brand?.code || '',
        metadata: values.metadata,
        metadata_type: values.metadataType?.value || 'qr',
        account_name: values.accountName,
        account_number: values.accountNumber,
        type: values.category?.value || 'store',
        updated: new Date().toISOString(),
        is_synced: false,
      };

      dispatch(updateQrData(updatedQrRecord));
      await insertOrUpdateQrCodes([updatedQrRecord]);
      router.replace('/(auth)/home');

    } catch (error) {
      console.error('Submission error:', error);
      // Consider adding more robust error handling (e.g., showing a user-friendly message).
    } finally {
      setSubmitting(false);
    }
  }, [dispatch, qrRecord, router]);

  // useCallback for onNavigateBack
  const onNavigateBack = useCallback(() => {
    router.back()
  }, [router]); // Removed qrRecord dependency as it's not necessary

  return (
    <QRForm
      initialValues={initialValues}
      onSubmit={handleFormSubmit}
      isEditing={true}
      onNavigateBack={onNavigateBack}
    />
  );
};

export default React.memo(EditScreen);