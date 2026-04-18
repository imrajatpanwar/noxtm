import React, { useState } from 'react';
import { FiBriefcase, FiUsers } from 'react-icons/fi';
import CompanyDataList from './CompanyDataList';
import AllContacts from './AllContacts';

const TABS = [
  { id: 'companies', label: 'Companies',    icon: FiBriefcase },
  { id: 'contacts',  label: 'All Contacts', icon: FiUsers },
];

function DataCenter() {
  const [activeTab, setActiveTab] = useState('companies');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', width: '100%', minHeight: '100%' }}>
      {/* Tab bar — aligned with page padding (32px) to match CompanyDataList */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          padding: '16px 32px 0',
          borderBottom: '1px solid #e5e7eb',
          background: '#fff',
          position: 'sticky',
          top: 0,
          zIndex: 10,
        }}
      >
        {TABS.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                padding: '10px 16px',
                fontSize: 14,
                fontWeight: 500,
                color: isActive ? '#09090b' : '#6b7280',
                background: 'transparent',
                border: 'none',
                borderBottom: isActive ? '2px solid #09090b' : '2px solid transparent',
                marginBottom: -1,
                cursor: 'pointer',
                transition: 'color 0.15s, border-color 0.15s',
              }}
              onMouseEnter={e => { if (!isActive) e.currentTarget.style.color = '#09090b'; }}
              onMouseLeave={e => { if (!isActive) e.currentTarget.style.color = '#6b7280'; }}
            >
              <Icon size={15} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      <div style={{ flex: 1, minHeight: 0 }}>
        {activeTab === 'companies' && <CompanyDataList />}
        {activeTab === 'contacts'  && <AllContacts />}
      </div>
    </div>
  );
}

export default DataCenter;
