import React from 'react';
import {
  Users, Clock, DollarSign, FileText, Settings,
  CheckCircle, Search, Menu, LogOut, ShieldCheck,
  ChevronRight, Calendar, UserPlus, Briefcase, GraduationCap
} from 'lucide-react';

// Import the Screen type from App to ensure type safety
export type ScreenId =
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

interface LayoutProps {
  activeScreen: ScreenId;
  onNavigate: (screen: ScreenId) => void;
  onLogout: () => void;
  role?: string; // Optional because initially it might be loading or undefined
  children: React.ReactNode;
}

interface NavItemProps {
  icon: React.ElementType;
  label: string;
  id: ScreenId;
  active: ScreenId;
  set: (id: ScreenId) => void;
}

// Shared NavItem component with enhanced styling
const NavItem: React.FC<NavItemProps> = ({ icon: Icon, label, id, active, set }) => (
  <button
    onClick={() => set(id)}
    className={`flex items-center gap-3 w-full p-3 rounded-lg transition-all duration-200 group ${active === id
        ? 'bg-blue-600/10 text-blue-400 border-r-2 border-blue-400'
        : 'text-slate-400 hover:bg-slate-800 hover:text-white'
      }`}
  >
    <Icon size={20} className={`transition-colors ${active === id ? 'text-blue-400' : 'text-slate-500 group-hover:text-white'}`} />
    <span className={`text-sm font-medium ${active === id ? 'text-blue-100' : ''}`}>{label}</span>
    {active === id && <ChevronRight size={16} className="ml-auto text-blue-400 opacity-50" />}
  </button>
);

interface SidebarProps {
  role: string;
  activeTab: ScreenId;
  setActiveTab: (id: ScreenId) => void;
  onLogout: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ role, activeTab, setActiveTab, onLogout }) => (
  <aside className="w-64 bg-slate-900 border-r border-slate-800 text-white h-screen flex flex-col fixed left-0 top-0 overflow-y-auto z-20 shadow-2xl">
    {/* Header Section */}
    <div className="p-6 border-b border-slate-800 bg-slate-900/50 backdrop-blur-sm">
      <div className="flex items-center gap-3 mb-1">
        <div className="p-2 bg-blue-600/20 rounded-lg">
          <ShieldCheck className="text-blue-400" size={24} />
        </div>
        <div>
          <h1 className="text-lg font-bold tracking-tight text-white leading-none">HR CORE</h1>
          <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider mt-1">Enterprise v2.5</p>
        </div>
      </div>
    </div>

    {/* Navigation Section */}
    <nav className="flex-1 p-4 space-y-1 overflow-y-auto custom-scrollbar">
      <div className="px-3 py-2 text-xs font-semibold text-slate-500 uppercase tracking-widest">Main Menu</div>

      <NavItem icon={Briefcase} label="Dashboard" id="Dashboard" active={activeTab} set={setActiveTab} />

      {/* ADMIN ROUTES */}
      {role === 'HR_ADMIN' && (
        <>
          <div className="my-4 border-t border-slate-800/50"></div>
          <div className="px-3 py-2 text-xs font-semibold text-slate-500 uppercase tracking-widest">Administration</div>

          <NavItem icon={Users} label="Employee Master" id="EmployeeMaster" active={activeTab} set={setActiveTab} />
          <NavItem icon={Calendar} label="Payroll Cockpit" id="Payroll" active={activeTab} set={setActiveTab} />
          <NavItem icon={Clock} label="Attendance" id="Attendance" active={activeTab} set={setActiveTab} />
          <NavItem icon={UserPlus} label="Onboarding" id="Onboarding" active={activeTab} set={setActiveTab} />
          <NavItem icon={FileText} label="Document Center" id="Documents" active={activeTab} set={setActiveTab} />
          <NavItem icon={GraduationCap} label="Training" id="Training" active={activeTab} set={setActiveTab} />
          <NavItem icon={Settings} label="Project Costing" id="ProjectCosting" active={activeTab} set={setActiveTab} />
        </>
      )}

      {/* MANAGER ROUTES */}
      {role === 'MANAGER' && (
        <>
          <div className="my-4 border-t border-slate-800/50"></div>
          <div className="px-3 py-2 text-xs font-semibold text-slate-500 uppercase tracking-widest">Management</div>

          <NavItem icon={CheckCircle} label="Approvals" id="Approvals" active={activeTab} set={setActiveTab} />
          {/* Note: 'team' isn't a top-level screen in App.tsx yet, mapped to Dashboard or defined screen if exists */}
        </>
      )}

      {/* WORKER / SHARED ROUTES */}
      <div className="my-4 border-t border-slate-800/50"></div>
      <div className="px-3 py-2 text-xs font-semibold text-slate-500 uppercase tracking-widest">Personal</div>

      <NavItem icon={Settings} label="Travel & Expense" id="Travel" active={activeTab} set={setActiveTab} />
      {/* Assuming workers access their docs via Document Center too, or specific screens */}
    </nav>

    {/* Footer Section */}
    <div className="p-4 border-t border-slate-800 bg-slate-900/50">
      <button
        onClick={onLogout}
        className="flex items-center gap-3 text-slate-400 hover:text-white hover:bg-red-500/10 hover:border-red-500/50 border border-transparent w-full p-3 rounded-lg transition-all"
      >
        <LogOut size={18} />
        <span className="font-medium text-sm">Sign Out</span>
      </button>
      <div className="text-center mt-3 text-[10px] text-slate-600">
        &copy; 2025 StarHR Systems
      </div>
    </div>
  </aside>
);

const Layout: React.FC<LayoutProps> = ({ children, activeScreen, onNavigate, onLogout, role = 'HR_ADMIN' }) => {
  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-[#0f1115]">
      <Sidebar
        role={role}
        activeTab={activeScreen}
        setActiveTab={onNavigate}
        onLogout={onLogout}
      />
      {/* Main Content Area - Offset by sidebar width */}
      <main className="flex-1 ml-64 min-w-0 flex flex-col h-screen overflow-y-auto">
        {/* Optional Top Bar can go here if needed, or just yield children */}
        {children}
      </main>
    </div>
  );
};

export default Layout;
