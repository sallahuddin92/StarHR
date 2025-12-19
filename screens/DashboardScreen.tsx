
import React, { useState, useEffect } from 'react';
import { api, DashboardSummary, ApiError } from '../src/lib/api';

const Sidebar: React.FC = () => (
    <aside className="w-64 bg-slate-sidebar h-full flex-col hidden md:flex transition-all duration-300 ease-in-out border-r border-slate-800">
        <div className="h-16 flex items-center px-6 border-b border-slate-800">
            <div className="flex items-center gap-2 text-white">
                <div className="size-8 bg-primary rounded-lg flex items-center justify-center text-slate-900">
                    <span className="material-symbols-outlined">dataset</span>
                </div>
                <div className="flex flex-col">
                    <span className="text-lg font-bold leading-none tracking-tight">EnterpriseHR</span>
                    <span className="text-[10px] text-slate-400 font-medium tracking-wider uppercase">Malaysia</span>
                </div>
            </div>
        </div>
        <nav className="flex-1 overflow-y-auto py-6 px-3 flex flex-col gap-1">
            <a className="group flex items-center gap-3 px-3 py-3 rounded-lg bg-primary/10 text-primary border-l-4 border-primary" href="#">
                <span className="material-symbols-outlined">dashboard</span>
                <span className="text-sm font-medium">Dashboard</span>
            </a>
            <a className="group flex items-center gap-3 px-3 py-3 rounded-lg text-slate-400 hover:bg-slate-800 hover:text-white transition-colors border-l-4 border-transparent" href="#">
                <span className="material-symbols-outlined">group</span>
                <span className="text-sm font-medium">People</span>
            </a>
            <a className="group flex items-center gap-3 px-3 py-3 rounded-lg text-slate-400 hover:bg-slate-800 hover:text-white transition-colors border-l-4 border-transparent" href="#">
                <span className="material-symbols-outlined">payments</span>
                <div className="flex flex-col">
                    <span className="text-sm font-medium">Payroll</span>
                    <span className="text-[10px] text-slate-500">EPF/SOCSO</span>
                </div>
            </a>
            <a className="group flex items-center gap-3 px-3 py-3 rounded-lg text-slate-400 hover:bg-slate-800 hover:text-white transition-colors border-l-4 border-transparent" href="#">
                <span className="material-symbols-outlined">schedule</span>
                <span className="text-sm font-medium">Time &amp; Attendance</span>
            </a>
            <a className="group flex items-center gap-3 px-3 py-3 rounded-lg text-slate-400 hover:bg-slate-800 hover:text-white transition-colors border-l-4 border-transparent" href="#">
                <span className="material-symbols-outlined">receipt_long</span>
                <span className="text-sm font-medium">Claims</span>
            </a>
            <div className="my-4 border-t border-slate-800 mx-3"></div>
            <a className="group flex items-center gap-3 px-3 py-3 rounded-lg text-slate-400 hover:bg-slate-800 hover:text-white transition-colors border-l-4 border-transparent" href="#">
                <span className="material-symbols-outlined">settings</span>
                <span className="text-sm font-medium">Settings</span>
            </a>
        </nav>
        <div className="p-4 border-t border-slate-800">
            <div className="flex items-center gap-3 p-2 rounded-lg bg-slate-800/50">
                <div className="size-8 rounded-full bg-slate-700 flex items-center justify-center text-slate-300">
                    <span className="material-symbols-outlined text-sm">business</span>
                </div>
                <div className="flex flex-col overflow-hidden">
                    <span className="text-xs font-medium text-white truncate">TechMy Sdn Bhd</span>
                    <span className="text-[10px] text-slate-400 truncate">Enterprise Plan</span>
                </div>
            </div>
        </div>
    </aside>
);

const Header: React.FC = () => (
    <header className="h-16 bg-white dark:bg-[#1a1a0b] border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-6 shrink-0 z-10">
        <div className="flex items-center gap-4">
            <button className="md:hidden p-2 text-slate-600 hover:bg-slate-100 rounded-full">
                <span className="material-symbols-outlined">menu</span>
            </button>
            <nav className="hidden sm:flex items-center text-sm font-medium text-slate-500">
                <a className="hover:text-slate-800 dark:hover:text-slate-200 transition-colors" href="#">Home</a>
                <span className="mx-2 text-slate-300">/</span>
                <span className="text-slate-800 dark:text-white">Dashboard</span>
            </nav>
        </div>
        <div className="flex items-center gap-3">
            <div className="hidden md:flex relative group">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 material-symbols-outlined text-[20px]">search</span>
                <input className="pl-10 pr-4 py-2 bg-slate-100 dark:bg-slate-800 border-none rounded-full text-sm w-64 focus:ring-2 focus:ring-primary/50 text-slate-800 dark:text-white placeholder:text-slate-400" placeholder="Search employees..." type="text" />
            </div>
            <button className="relative size-10 flex items-center justify-center rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors">
                <span className="material-symbols-outlined">notifications</span>
                <span className="absolute top-2 right-2 size-2 bg-red-500 rounded-full border-2 border-white dark:border-[#1a1a0b]"></span>
            </button>
            <button className="size-10 flex items-center justify-center rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors font-bold text-xs">
                BM
            </button>
            <div className="flex items-center gap-3 pl-2 border-l border-slate-200 dark:border-slate-700 ml-2">
                <div className="text-right hidden sm:block">
                    <div className="text-sm font-bold text-slate-800 dark:text-white">Admin User</div>
                    <div className="text-xs text-slate-500">HR Manager</div>
                </div>
                <div className="size-10 rounded-full bg-slate-200 bg-center bg-cover border-2 border-white shadow-sm" style={{ backgroundImage: `url('https://picsum.photos/id/237/100/100')` }}></div>
            </div>
        </div>
    </header>
);

const recentActivities = [
    { name: 'Ahmad Zaki', initials: 'AZ', color: 'indigo', type: 'Annual Leave', date: '25 Oct - 27 Oct', status: 'Pending', actionIcon: 'edit_square' },
    { name: 'Sarah Lim', initials: 'SL', color: 'pink', type: 'Medical Claim', date: '22 Oct', status: 'Approved', actionIcon: 'visibility' },
    { name: 'Muthu Raj', initials: 'MR', color: 'blue', type: 'OT Request', date: '20 Oct', status: 'Approved', actionIcon: 'visibility' }
];

const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
    const baseClasses = "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium";
    if (status === 'Pending') {
        return <span className={`${baseClasses} bg-orange-100 text-orange-700`}>Pending</span>;
    }
    return <span className={`${baseClasses} bg-green-100 text-green-700`}>Approved</span>;
};

const LoadingSkeleton: React.FC = () => (
    <div className="animate-pulse">
        <div className="h-10 bg-slate-200 dark:bg-slate-700 rounded w-20"></div>
    </div>
);

const DashboardScreen: React.FC = () => {
    const [stats, setStats] = useState<DashboardSummary | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                setLoading(true);
                const response = await api.stats.getSummary();
                if (response.success && response.data) {
                    setStats(response.data);
                }
            } catch (err) {
                const message = err instanceof ApiError ? err.message : 'Failed to load dashboard';
                setError(message);
            } finally {
                setLoading(false);
            }
        };

        fetchStats();
    }, []);

    const formatPayrollDate = (dateStr: string | null) => {
        if (!dateStr) return '--';
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
    };

    const formatPayrollDay = (dateStr: string | null) => {
        if (!dateStr) return '';
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-GB', { weekday: 'short' });
    };

    const getCutoffText = (cutoffDate: string | null) => {
        if (!cutoffDate) return 'Processing cutoff: --';
        const today = new Date();
        const cutoff = new Date(cutoffDate);
        const diffDays = Math.ceil((cutoff.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        
        if (diffDays === 0) return 'Processing cutoff: Today';
        if (diffDays === 1) return 'Processing cutoff: Tomorrow';
        if (diffDays < 0) return 'Processing cutoff: Passed';
        return `Processing cutoff: ${diffDays} days`;
    };

    return (
        <div className="font-display bg-background-light dark:bg-background-dark text-slate-800 dark:text-slate-100 h-screen w-full flex">
            <Sidebar />
            <main className="flex-1 flex flex-col h-full min-w-0 bg-background-light dark:bg-background-dark relative">
                <Header />
                <div className="flex-1 overflow-y-auto p-4 md:p-8 relative">
                    <div className="max-w-[1200px] mx-auto flex flex-col gap-8 pb-20">
                        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                            <div className="flex flex-col gap-1">
                                <h1 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-white tracking-tight">Selamat Datang, Admin</h1>
                                <p className="text-slate-500 dark:text-slate-400">Here's what's happening in your Malaysian HR operations today.</p>
                            </div>
                            <div className="text-sm text-slate-500 bg-white dark:bg-slate-800 px-4 py-2 rounded-full shadow-sm border border-slate-100 dark:border-slate-700 flex items-center gap-2">
                                <span className="material-symbols-outlined text-primary text-lg">calendar_today</span>
                                <span>Today: {new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col justify-between h-36 relative overflow-hidden group">
                                <div className="absolute right-0 top-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                                    <span className="material-symbols-outlined text-6xl text-slate-400">group</span>
                                </div>
                                <div className="flex flex-col">
                                    <p className="text-slate-500 dark:text-slate-400 text-sm font-medium uppercase tracking-wider">Total Employees</p>
                                    <div className="flex items-baseline gap-2 mt-2">
                                        {loading ? <LoadingSkeleton /> : (
                                            <>
                                                <h3 className="text-4xl font-bold text-slate-900 dark:text-white">{stats?.totalEmployees ?? 0}</h3>
                                                {(stats?.newEmployeesThisMonth ?? 0) > 0 && (
                                                    <span className="text-xs font-bold text-green-600 bg-green-100 px-2 py-0.5 rounded-full">+{stats?.newEmployeesThisMonth} this month</span>
                                                )}
                                            </>
                                        )}
                                    </div>
                                </div>
                                <div className="w-full bg-slate-100 rounded-full h-1.5 mt-auto">
                                    <div className="bg-primary h-1.5 rounded-full" style={{ width: "85%" }}></div>
                                </div>
                            </div>
                            <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col justify-between h-36 relative overflow-hidden group">
                                <div className="absolute right-0 top-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                                    <span className="material-symbols-outlined text-6xl text-orange-400">pending_actions</span>
                                </div>
                                <div className="flex flex-col">
                                    <p className="text-slate-500 dark:text-slate-400 text-sm font-medium uppercase tracking-wider">Pending Actions</p>
                                    <div className="flex items-baseline gap-2 mt-2">
                                        {loading ? <LoadingSkeleton /> : (
                                            <>
                                                <h3 className="text-4xl font-bold text-slate-900 dark:text-white">{(stats?.pendingAttendance ?? 0) + (stats?.pendingEwa ?? 0)}</h3>
                                                <span className="text-sm text-slate-400">requests</span>
                                            </>
                                        )}
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 mt-auto text-xs text-orange-600 font-medium">
                                    {((stats?.pendingAttendance ?? 0) + (stats?.pendingEwa ?? 0)) > 0 && (
                                        <>
                                            <span className="material-symbols-outlined text-sm">warning</span>
                                            Action required
                                        </>
                                    )}
                                </div>
                            </div>
                            <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col justify-between h-36 relative overflow-hidden group">
                                <div className="absolute right-0 top-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                                    <span className="material-symbols-outlined text-6xl text-green-400">payments</span>
                                </div>
                                <div className="flex flex-col">
                                    <p className="text-slate-500 dark:text-slate-400 text-sm font-medium uppercase tracking-wider">Next Payroll</p>
                                    <div className="flex items-baseline gap-2 mt-2">
                                        {loading ? <LoadingSkeleton /> : (
                                            <>
                                                <h3 className="text-4xl font-bold text-slate-900 dark:text-white">{formatPayrollDate(stats?.nextPayrollDate ?? null)}</h3>
                                                <span className="text-sm text-slate-400">{formatPayrollDay(stats?.nextPayrollDate ?? null)}</span>
                                            </>
                                        )}
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 mt-auto text-xs text-slate-500">
                                    {getCutoffText(stats?.payrollCutoffDate ?? null)}
                                </div>
                            </div>
                        </div>
                        <div className="flex flex-col gap-4">
                            <div className="flex items-center justify-between">
                                <h2 className="text-lg font-bold text-slate-900 dark:text-white">Recent Activities</h2>
                                <button className="text-sm font-bold text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white">View All</button>
                            </div>
                            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm text-left">
                                        <thead className="text-xs text-slate-500 uppercase bg-slate-50 dark:bg-slate-700/50 border-b border-slate-200 dark:border-slate-700">
                                            <tr>
                                                <th className="px-6 py-3 font-medium">Employee</th>
                                                <th className="px-6 py-3 font-medium">Type</th>
                                                <th className="px-6 py-3 font-medium">Date</th>
                                                <th className="px-6 py-3 font-medium">Status</th>
                                                <th className="px-6 py-3 font-medium text-right">Action</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                                            {recentActivities.map(activity => (
                                                <tr key={activity.name} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                                                    <td className="px-6 py-4 font-medium text-slate-900 dark:text-white flex items-center gap-3">
                                                        <div className={`size-8 rounded-full bg-${activity.color}-100 text-${activity.color}-600 flex items-center justify-center text-xs font-bold`}>{activity.initials}</div>
                                                        {activity.name}
                                                    </td>
                                                    <td className="px-6 py-4 text-slate-500">{activity.type}</td>
                                                    <td className="px-6 py-4 text-slate-500">{activity.date}</td>
                                                    <td className="px-6 py-4">
                                                        <StatusBadge status={activity.status} />
                                                    </td>
                                                    <td className="px-6 py-4 text-right">
                                                        <button className="text-slate-400 hover:text-primary transition-colors">
                                                            <span className="material-symbols-outlined">{activity.actionIcon}</span>
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <button className="absolute bottom-8 right-8 z-20 bg-primary text-slate-900 rounded-full h-14 pl-4 pr-6 flex items-center gap-2 shadow-lg hover:bg-[#e6e205] hover:shadow-xl transition-all active:scale-95 group">
                    <div className="bg-slate-900/10 rounded-full p-1 group-hover:bg-slate-900/20 transition-colors">
                        <span className="material-symbols-outlined">add</span>
                    </div>
                    <span className="font-bold text-sm">Quick Action</span>
                </button>
            </main>
        </div>
    );
};

export default DashboardScreen;
