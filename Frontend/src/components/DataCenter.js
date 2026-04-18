import React, { useState } from 'react';
import { FiBriefcase, FiUsers } from 'react-icons/fi';
import CompanyDataList from './CompanyDataList';
import AllContacts from './AllContacts';

const TABS = [
  { id: 'companies', label: 'Companies', icon: FiBriefcase },
  { id: 'contacts',  label: 'All Contacts', icon: FiUsers },
];

function DataCenter() {
  const [activeTab, setActiveTab] = useState('companies');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', width: '100%', minHeight: '100%' }}>
      {activeTab === 'companies' && (
        <CompanyDataList activeTab={activeTab} tabs={TABS} onTabChange={setActiveTab} />
      )}
      {activeTab === 'contacts' && (
        <AllContacts activeTab={activeTab} tabs={TABS} onTabChange={setActiveTab} />
      )}
    </div>
  );
}

export default DataCenter;
