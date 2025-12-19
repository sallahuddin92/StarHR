
import React, { useState, useEffect } from 'react';
import DashboardScreen from './screens/DashboardScreen';
import PayrollCockpitScreen from './screens/PayrollCockpitScreen';
import AttendanceInterventionScreen from './screens/AttendanceInterventionScreen';
import PendingApprovalsScreen from './screens/PendingApprovalsScreen';
import DocumentCenterScreen from './screens/DocumentCenterScreen';
import EmployeeMasterScreen from './screens/EmployeeMasterScreen';
import LoginScreen from './screens/LoginScreen';

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
  const [activeScreen, setActiveScreen] = useState<Screen>('EmployeeMaster');
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [checkingAuth, setCheckingAuth] = useState<boolean>(true);

  useEffect(() => {
    const token = localStorage.getItem('authToken');
    setIsAuthenticated(!!token);
    setCheckingAuth(false);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
    setIsAuthenticated(false);
  };

  if (checkingAuth) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background-light dark:bg-background-dark">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginScreen onLoginSuccess={() => setIsAuthenticated(true)} />;
  }

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
        <button 
          onClick={handleLogout}
          className="px-3 py-1 text-xs rounded-full bg-red-600 hover:bg-red-500 transition-colors ml-4"
        >
          Logout
        </button>
      </nav>
      <div className="flex-grow">
        {renderScreen()}
      </div>
    </div>
  );
};

export default App;
