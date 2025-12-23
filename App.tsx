
import React, { useState, useEffect } from 'react';
import DashboardScreen from './screens/DashboardScreen';
import PayrollCockpitScreen from './screens/PayrollCockpitScreen';
import AttendanceInterventionScreen from './screens/AttendanceInterventionScreen';
import PendingApprovalsScreen from './screens/PendingApprovalsScreen';
import DocumentCenterScreen from './screens/DocumentCenterScreen';
import EmployeeMasterScreen from './screens/EmployeeMasterScreen';
import OnboardingScreen from './screens/OnboardingScreen';
import TravelScreen from './screens/TravelScreen';
import ProjectCostingScreen from './screens/ProjectCostingScreen';
import TrainingScreen from './screens/TrainingScreen';
import LoginScreen from './screens/LoginScreen';
import Layout from './src/components/Layout';
import { api } from './src/lib/api';

export type Screen =
  | 'Dashboard'
  | 'Payroll'
  | 'Attendance'
  | 'Approvals'
  | 'Documents'
  | 'EmployeeMaster'
  | 'Onboarding'
  | 'Travel'
  | 'ProjectCosting'
  | 'Training';

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
  { id: 'Onboarding', name: 'Onboarding' },
  { id: 'Travel', name: 'Travel & Expense' },
  { id: 'ProjectCosting', name: 'Project Costing' },
  { id: 'Training', name: 'Training' },
];

const App: React.FC = () => {
  const [activeScreen, setActiveScreen] = useState<Screen>('Dashboard');
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [checkingAuth, setCheckingAuth] = useState<boolean>(true);
  const [userRole, setUserRole] = useState<string>('HR_ADMIN');

  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem('authToken');
      const userStr = localStorage.getItem('user');

      // Safety: If token exists but user is missing (stale session), force logout
      if (token && !userStr) {
        console.warn('Session Stale: No user data found. Forcing re-login.');
        localStorage.removeItem('authToken');
        setIsAuthenticated(false);
        setCheckingAuth(false);
        return;
      }

      // If no token, just go to login
      if (!token) {
        setIsAuthenticated(false);
        setCheckingAuth(false);
        return;
      }

      // Set initial state from localStorage (fast)
      setIsAuthenticated(true);
      let role = 'HR_ADMIN'; // Default

      if (userStr) {
        try {
          const user = JSON.parse(userStr);
          if (user.role) {
            role = user.role;
          }
        } catch (e) {
          console.error("Failed to parse user role", e);
          localStorage.removeItem('user');
        }
      }

      // CRITICAL: Sync with server to get the REAL role before rendering dashboard
      try {
        const freshUser = await api.auth.me();
        if (freshUser && freshUser.role) {
          console.log("[App.tsx] Role from server:", freshUser.role);
          role = freshUser.role;
        }
      } catch (err) {
        console.warn("[App.tsx] Failed to sync role with server, using cached:", role);
      }

      setUserRole(role);
      console.log('[App.tsx] Final userRole set to:', role);
      setCheckingAuth(false);
    };

    initAuth();
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
    setIsAuthenticated(false);
    setUserRole('HR_ADMIN'); // Reset to default
  };

  // Called when LoginScreen successfully authenticates
  const handleLoginSuccess = () => {
    // Read the freshly saved user from localStorage (set by api.auth.login)
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        if (user.role) {
          console.log('[App.tsx] Login success, setting role:', user.role);
          setUserRole(user.role);
        }
      } catch (e) {
        console.error('[App.tsx] Failed to parse user after login:', e);
      }
    }
    setIsAuthenticated(true);
  };

  if (checkingAuth) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background-light dark:bg-background-dark">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginScreen onLoginSuccess={handleLoginSuccess} />;
  }

  const renderScreen = () => {
    switch (activeScreen) {
      case 'Dashboard':
        return <DashboardScreen onNavigate={setActiveScreen} userRole={userRole} />;
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
      case 'Onboarding':
        return <OnboardingScreen onNavigate={setActiveScreen} />;
      case 'Travel':
        return <TravelScreen onNavigate={setActiveScreen} />;
      case 'ProjectCosting':
        return <ProjectCostingScreen onNavigate={setActiveScreen} />;
      case 'Training':
        return <TrainingScreen onNavigate={setActiveScreen} />;
      default:
        return <DashboardScreen onNavigate={setActiveScreen} userRole={userRole} />;
    }
  };

  return (
    <Layout activeScreen={activeScreen} onNavigate={setActiveScreen} onLogout={handleLogout} role={userRole}>
      {renderScreen()}
    </Layout>
  );
};

export default App;
