// EditScreen.tsx
import React, { useCallback, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { router, useLocalSearchParams } from 'expo-router';
import { FormikHelpers } from 'formik';
import QRForm from '@/components/forms/QRForm';
import { updateQrData } from '@/store/reducers/qrSlice'; // Use updateQrData
import { RootState } from '@/store/rootReducer';
import QRRecord from '@/types/qrType';
import { insertOrUpdateQrCodes } from '@/services/localDB/qrDB';
import { t } from '@/i18n';
import { BrandItem, CategoryItem, FormParams, MetadataTypeItem } from '@/components/forms/QRForm';
import { returnItemData } from '@/utils/returnItemData';

const EditScreen: React.FC = () => {
  const dispatch = useDispatch();
  const userId = useSelector((state: RootState) => state.auth.user?.id ?? '');
  const { id } = useLocalSearchParams<{ id?: string }>();  // Get the ID of the QR code to edit
  const qrRecords = useSelector((state: RootState) => state.qr.qrData);
  const qrRecord = qrRecords.find((record) => record.id === id); // Find the record

    // If no record is found, navigate back
  const onNavigateBack = useCallback(() => {
      if (!qrRecord) {
          router.back()
      }
  }, [qrRecord]);
  const categoryMap = useMemo(
    () => ({
        bank: { display: t('editScreen.bankCategory'), value: 'bank' },
        ewallet: { display: t('editScreen.ewalletCategory'), value: 'ewallet' },
        store: { display: t('editScreen.storeCategory'), value: 'store' },
      }),
      [t]
    );
    const metadataTypeData: MetadataTypeItem[] = useMemo(
      () => [
        { display: t('editScreen.qr'), value: 'qr' },
        { display: t('editScreen.barcode'), value: 'barcode' },
      ],
      [t]
    );
    const getItemDataHelper = useCallback(
      (itemCode: string, locale: string): BrandItem | null => {
        const itemData = returnItemData(itemCode);
  
        const isExpectedType = (type: string): type is 'bank' | 'store' | 'ewallet' => {
          return ['bank', 'store', 'ewallet'].includes(type);
        };
  
        return itemData && isExpectedType(itemData.type)
          ? {
            code: itemCode,
            name: itemData.name,
            full_name: itemData.full_name[locale],
            type: itemData.type,
          }
          : null;
      },
      []
    );
  
    // Prepare initial values for the form, pre-populated with existing data
    const initialValues: FormParams = useMemo(() => {
      if (!qrRecord) {
        return { // Return default values if no record.  Important!
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
      const brand = qrRecord.code ? getItemDataHelper(qrRecord.code, 'en') : null; //Need improve
      const metadataType = metadataTypeData.find(item => item.value === qrRecord.metadata_type) || metadataTypeData[0]
  
      return {
        category: category as CategoryItem,
        brand: brand,
        metadataType: metadataType,
        metadata: qrRecord.metadata,
        accountName: qrRecord.account_name,
        accountNumber: qrRecord.account_number,
      };
    }, [qrRecord, categoryMap, metadataTypeData, getItemDataHelper]);
  
    const handleFormSubmit = useCallback(
      async (values: FormParams, formikHelpers: FormikHelpers<FormParams>) => {
        if (!qrRecord) return; // Safety check
  
        const now = new Date().toISOString();
  
        try {
          // Create the updated QR record
          const updatedQrRecord: QRRecord = {
            ...qrRecord, // Copy existing data
            code: values.brand?.code || '',
            metadata: values.metadata,
            metadata_type: values.metadataType?.value || 'qr',
            account_name: values.accountName,
            account_number: values.accountNumber,
            type: values.category?.value || 'store',
            updated: now, // Update the timestamp
            is_synced: false, // Mark as needing sync
          };
  
          // Optimistically update Redux store
          dispatch(updateQrData(updatedQrRecord));
  
          // Save to the database
          await insertOrUpdateQrCodes([updatedQrRecord]);
  
          // Navigate back
          router.replace('/(auth)/home');
        } catch (error) {
          console.error('Submission error:', error);
          // Handle errors (you might want to revert the Redux state in a real app)
        } finally {
          formikHelpers.setSubmitting(false);
        }
      },
      [dispatch, qrRecord, router]
    );
  
    // Render the QRForm component in edit mode
    return (
      <QRForm
        initialValues={initialValues}
        onSubmit={handleFormSubmit}
        isEditing={true} // Set to true for edit mode
        onNavigateBack={onNavigateBack}
      />
    );
  };
  
  export default React.memo(EditScreen);