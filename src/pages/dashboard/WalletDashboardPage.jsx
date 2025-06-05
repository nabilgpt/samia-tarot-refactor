import React from 'react';
import { useTranslation } from 'react-i18next';
import ClientLayout from '../../components/Layout/ClientLayout.jsx';
import ClientWallet from '../../components/Client/ClientWallet';

const WalletDashboardPage = () => {
  const { t } = useTranslation();

  return (
    <ClientLayout>
      <div className="min-h-screen">
        <ClientWallet />
      </div>
    </ClientLayout>
  );
};

export default WalletDashboardPage; 