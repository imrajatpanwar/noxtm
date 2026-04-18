import React, { useState } from 'react';
import { FiBriefcase, FiUsers } from 'react-icons/fi';
import CompanyDataList from './CompanyDataList';

const TABS = [
  { id: 'companies', label: 'Companies', icon: FiBriefcase },
  { id: 'contacts',  label: 'All Contacts', icon: FiUsers },
];

function DataCenter() {
  const [activeTab, setActiveTab] = useState('companies');

  return (
    <CompanyDataList activeTab={activeTab} tabs={TABS} onTabChange={setActiveTab} />
  );
}

export default DataCenter;
