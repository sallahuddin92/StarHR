import React from 'react';

type ScreenId =
  | 'Dashboard'
  | 'Payroll'
  | 'Attendance'
  | 'Approvals'
  | 'Documents'
  | 'EmployeeMaster';

interface LayoutProps {
  activeScreen: ScreenId;
  onNavigate: (screen: ScreenId) => void;
  onLogout: () => void;
  children: React.ReactNode;
}

const navItems: { id: ScreenId; name: string; icon: string }[] = [
  { id: 'Dashboard', name: 'Dashboard', icon: 'dashboard' },
  { id: 'Payroll', name: 'Payroll Cockpit', icon: 'payments' },
  { id: 'Attendance', name: 'Attendance Intervention', icon: 'schedule' },
  { id: 'Approvals', name: 'Pending Approvals', icon: 'inbox' },
  { id: 'Documents', name: 'Document Center', icon: 'description' },
  { id: 'EmployeeMaster', name: 'Employee Master', icon: 'group' },
];

const Layout: React.FC<LayoutProps> = ({ activeScreen, onNavigate, onLogout, children }) => {
  return (
    <div className="flex min-h-screen bg-background-light dark:bg-background-dark text-slate-900 dark:text-white">
      <aside className="hidden md:flex w-64 flex-col bg-slate-900 text-white border-r border-slate-800">
        <div className="h-16 flex items-center px-5 border-b border-slate-800 gap-3">
          <div className="size-9 rounded-lg bg-primary flex items-center justify-center text-slate-900 font-bold">HR</div>
          <div className="flex flex-col leading-tight">
            <span className="font-bold">Enterprise HR</span>
            <span className="text-xs text-slate-300">Malaysia</span>
          </div>
        </div>
        <nav className="flex-1 overflow-y-auto py-4">
          {navItems.map((item) => {
            const isActive = item.id === activeScreen;
            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 text-sm transition-colors border-l-4 ${
                  isActive
                    ? 'bg-primary/15 text-primary border-primary'
                    : 'text-slate-300 border-transparent hover:bg-slate-800 hover:text-white'
                }`}
              >
                <span className="material-symbols-outlined text-lg">{item.icon}</span>
                <span className="font-medium">{item.name}</span>
              </button>
            );
          })}
        </nav>
        <div className="p-4 border-t border-slate-800">
          <button
            onClick={onLogout}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-sm font-semibold"
          >
            <span className="material-symbols-outlined text-[18px]">logout</span>
            Logout
          </button>
        </div>
      </aside>

      <div className="flex flex-1 flex-col min-w-0">
        <header className="h-14 flex items-center justify-between px-4 md:px-6 border-b border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 backdrop-blur sticky top-0 z-20">
          <div className="flex items-center gap-3 text-sm text-slate-600 dark:text-slate-300">
            <span className="material-symbols-outlined text-primary">apps</span>
            <span className="font-semibold">Enterprise HR Portal</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="size-9 rounded-full bg-slate-200 bg-center bg-cover border-2 border-white shadow" style={{ backgroundImage: `url('https://picsum.photos/id/237/100/100')` }}></div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
};

export default Layout;
