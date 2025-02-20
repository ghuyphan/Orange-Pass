// AddScreen.tsx
import React, { useCallback, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { router, useLocalSearchParams } from 'expo-router';
import { FormikHelpers } from 'formik';
// import QRForm from '@/components/QRForm';  // Import the new component
import QRForm from '@/components/forms/QRForm';
import { addQrData, removeQrData } from '@/store/reducers/qrSlice';
import { RootState } from '@/store/rootReducer';
import { generateUniqueId } from '@/utils/uniqueId';
import QRRecord from '@/types/qrType';
import { getNextQrIndex, insertOrUpdateQrCodes } from '@/services/localDB/qrDB';
import { returnItemCodeByBin, returnItemData } from '@/utils/returnItemData';
import { useLocale } from '@/context/LocaleContext';
import { t } from '@/i18n';
import { CategoryItem, BrandItem, MetadataTypeItem, FormParams } from '@/components/forms/QRForm'; // Corrected import

const AddScreen: React.FC = () => {
    const dispatch = useDispatch();
    const userId = useSelector((state: RootState) => state.auth.user?.id ?? '');
    const { locale: currentLocale } = useLocale();
    const locale = currentLocale ?? 'en';
    const { codeFormat, codeValue, codeBin, codeType, codeProvider } = useLocalSearchParams<{
        codeFormat?: string;
        codeValue?: string;
        codeBin?: string;
        codeType?: string;
        codeProvider?: string;
    }>();
    const onNavigateBack = useCallback(() => router.back(), []);

      const categoryMap = useMemo(
        () => ({
        bank: { display: t('addScreen.bankCategory'), value: 'bank' },
        ewallet: { display: t('addScreen.ewalletCategory'), value: 'ewallet' },
        store: { display: t('addScreen.storeCategory'), value: 'store' },
        }),
        [t]
    );
    const metadataTypeData: MetadataTypeItem[] = useMemo(
        () => [
          { display: t('addScreen.qr'), value: 'qr' },
          { display: t('addScreen.barcode'), value: 'barcode' },
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

    const { itemCode } = useMemo(() => {
        const isEWallet = codeType === 'ewallet';
        return {
          bankCode: !isEWallet && codeBin ? returnItemCodeByBin(codeBin) : null,
          itemCode: codeProvider || returnItemCodeByBin(codeBin || ''),
        };
      }, [codeBin, codeType, codeProvider]);

      const initialValues: FormParams = useMemo(() => {
        const categoryKey = codeType as keyof typeof categoryMap;
        const category = categoryKey && categoryMap[categoryKey] ? categoryMap[categoryKey] as CategoryItem : null;
        const brand = codeType && itemCode ? getItemDataHelper(itemCode, locale) : null;
    
        let metadataType: MetadataTypeItem;
        switch (codeFormat) {
          case '256':
            metadataType = metadataTypeData.find(item => item.value === 'qr') || metadataTypeData[0];
            break;
          case '1':
            metadataType = metadataTypeData.find(item => item.value === 'barcode') || metadataTypeData[0];
            break;
          default:
            metadataType = metadataTypeData[0];
        }
    
        return {
          metadataType: metadataType,
          category: category,
          brand: brand,
          metadata: codeValue || '',
          accountName: '',
          accountNumber: '',
        };
      }, [codeType, itemCode, locale, categoryMap, codeValue, codeFormat, metadataTypeData, getItemDataHelper]);

  const handleFormSubmit = useCallback(
    async (values: FormParams, formikHelpers: FormikHelpers<FormParams>) => {
      const newId = generateUniqueId();
      const now = new Date().toISOString();

      try {
        const nextIndex = await getNextQrIndex(userId);
        const newQrRecord: QRRecord = {
          id: newId,
          qr_index: nextIndex,
          user_id: userId,
          code: values.brand?.code || '',
          metadata: values.metadata,
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
        router.replace('/(auth)/home');

      } catch (error) {
        console.error('Submission error:', error);
        dispatch(removeQrData(newId));
        // Alert user
      } finally {
        formikHelpers.setSubmitting(false);
      }
    },
    [dispatch, router, userId]
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