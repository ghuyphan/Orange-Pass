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
import { useLocale } from '@/context/LocaleContext';
import { BrandItem, CategoryItem, FormParams, MetadataTypeItem } from '@/components/forms/QRForm';
import { returnItemData } from '@/utils/returnItemData';

const EditScreen: React.FC = () => {
  const dispatch = useDispatch();
  const { id } = useLocalSearchParams<{ id?: string }>();  // Get the ID
  const qrRecord = useSelector((state: RootState) => state.qr.qrData.find(record => record.id === id)); // Find the record
  const { locale: currentLocale } = useLocale();
  const locale = currentLocale ?? 'en';

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
      full_name: itemData.full_name[locale] || itemData.full_name['en'] || itemData.name,
      type: itemData.type as 'bank' | 'store' | 'ewallet', // Type assertion is safe due to the check above
    };
  }, []);

  // Memoized initial values. Calculates ONLY when dependencies change.
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
    const category = categoryMap[categoryKey] || null;
    const brand = qrRecord.code ? getItemDataHelper(qrRecord.code, locale) : null;
    const metadataType = metadataTypeData.find(item => item.value === qrRecord.metadata_type) || metadataTypeData[0];

    return {
      category: category as CategoryItem | null,
      brand,
      metadataType,
      metadata: qrRecord.metadata,
      accountName: qrRecord.account_name,
      accountNumber: qrRecord.account_number,
    };
  }, [qrRecord, categoryMap, metadataTypeData, getItemDataHelper, locale]);

  // Memoized form submission handler
  const handleFormSubmit = useCallback(async (values: FormParams, { setSubmitting, setFieldError }: FormikHelpers<FormParams>) => {
    if (!qrRecord) return;

    setSubmitting(true); // Set loading immediately

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

    // Optimistic Update: Dispatch *before* the await
    dispatch(updateQrData(updatedQrRecord));

    try {
      // Database update *after* the optimistic UI update.
      await insertOrUpdateQrCodes([updatedQrRecord]);

      // ADD THIS: Short delay to allow React to update the UI with loading state
      await new Promise(resolve => setTimeout(resolve, 300));

      router.replace('/(auth)/home'); // Navigate after successful update
    } catch (error) {
      console.error('Submission error:', error);
      setFieldError('metadata', 'Failed to save changes.'); // Example
    } finally {
      setSubmitting(false); // Turn off loading *after* everything (success or error)
    }
  }, [dispatch, qrRecord, router]);


  // useCallback for onNavigateBack
  const onNavigateBack = useCallback(() => {
    router.back()
  }, [router]);

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