
import React, { useState } from 'react';
import DashboardScreen from './screens/DashboardScreen';
import PayrollCockpitScreen from './screens/PayrollCockpitScreen';
import AttendanceInterventionScreen from './screens/AttendanceInterventionScreen';
import PendingApprovalsScreen from './screens/PendingApprovalsScreen';
import DocumentCenterScreen from './screens/DocumentCenterScreen';
import EmployeeMasterScreen from './screens/EmployeeMasterScreen';

type Screen = 
  | 'Dashboard' 
  | 'Payroll' 
  | 'Attendance' 
  | 'Approvals' 
  | 'Documents' 
  | 'EmployeeMaster';

const screens: { id: Screen, name: string }[] = [
  { id: 'Dashboard', name: 'Dashboard' },
  { id: 'Payroll', name: 'Payroll Cockpit' },
  { id: 'Attendance', name: 'Attendance Intervention' },
  { id: 'Approvals', name: 'Pending Approvals' },
  { id: 'Documents', name: 'Document Center' },
  { id: 'EmployeeMaster', name: 'Employee Master' },
];

const App: React.FC = () => {
  const [activeScreen, setActiveScreen] = useState<Screen>('Dashboard');

  const renderScreen = () => {
    switch (activeScreen) {
      case 'Dashboard':
        return <DashboardScreen />;
      case 'Payroll':
        return <PayrollCockpitScreen />;
      case 'Attendance':
        return <AttendanceInterventionScreen />;
      case 'Approvals':
        return <PendingApprovalsScreen />;
      case 'Documents':
        return <DocumentCenterScreen />;
      case 'EmployeeMaster':
        return <EmployeeMasterScreen />;
      default:
        return <DashboardScreen />;
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <nav className="bg-slate-900 text-white p-2 shadow-lg sticky top-0 z-[100] flex flex-wrap justify-center items-center gap-x-4 gap-y-2">
        <span className="font-bold text-sm mr-2">Switch Screen:</span>
        {screens.map(screen => (
          <button 
            key={screen.id} 
            onClick={() => setActiveScreen(screen.id)}
            className={`px-3 py-1 text-xs rounded-full transition-colors ${activeScreen === screen.id ? 'bg-primary text-black font-bold' : 'bg-slate-700 hover:bg-slate-600'}`}
          >
            {screen.name}
          </button>
        ))}
      </nav>
      <div className="flex-grow">
        {renderScreen()}
      </div>
    </div>
  );
};

export default App;
