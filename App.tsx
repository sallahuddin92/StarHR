
import React, { useState, useEffect } from 'react';
import DashboardScreen from './screens/DashboardScreen';
import PayrollCockpitScreen from './screens/PayrollCockpitScreen';
import AttendanceInterventionScreen from './screens/AttendanceInterventionScreen';
import PendingApprovalsScreen from './screens/PendingApprovalsScreen';
import DocumentCenterScreen from './screens/DocumentCenterScreen';
import EmployeeMasterScreen from './screens/EmployeeMasterScreen';
import LoginScreen from './screens/LoginScreen';
import Layout from './src/components/Layout';

export type Screen = 
  | 'Dashboard' 
  | 'Payroll' 
  | 'Attendance' 
  | 'Approvals' 
  | 'Documents' 
  | 'EmployeeMaster';

export interface ScreenProps {
  onNavigate: (screen: Screen) => void;
}

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
        return <DashboardScreen onNavigate={setActiveScreen} />;
      case 'Payroll':
        return <PayrollCockpitScreen onNavigate={setActiveScreen} />;
      case 'Attendance':
        return <AttendanceInterventionScreen onNavigate={setActiveScreen} />;
      case 'Approvals':
        return <PendingApprovalsScreen onNavigate={setActiveScreen} />;
      case 'Documents':
        return <DocumentCenterScreen onNavigate={setActiveScreen} />;
      case 'EmployeeMaster':
        return <EmployeeMasterScreen onNavigate={setActiveScreen} />;
      default:
        return <DashboardScreen onNavigate={setActiveScreen} />;
    }
  };

  return (
    <Layout activeScreen={activeScreen} onNavigate={setActiveScreen} onLogout={handleLogout}>
      {renderScreen()}
    </Layout>
  );
};

export default App;
