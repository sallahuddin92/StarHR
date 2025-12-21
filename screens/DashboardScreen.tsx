
import React, { useState, useEffect } from 'react';
import { api, DashboardSummary, ApiError, ApprovalRequest } from '../src/lib/api';
import { Screen } from '../App';

interface DashboardScreenProps {
    onNavigate: (screen: Screen) => void;
}

interface RecentActivity {
    id: string;
    name: string;
    initials: string;
    color: string;
    type: string;
    date: string;
    status: 'Pending' | 'Approved' | 'Rejected';
    actionIcon: string;
}

const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
    const baseClasses = "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium";
    if (status === 'Pending') {
        return <span className={`${baseClasses} bg-orange-100 text-orange-700`}>Pending</span>;
    }
    if (status === 'Rejected') {
        return <span className={`${baseClasses} bg-red-100 text-red-700`}>Rejected</span>;
    }
    return <span className={`${baseClasses} bg-green-100 text-green-700`}>Approved</span>;
};

const LoadingSkeleton: React.FC = () => (
    <div className="animate-pulse">
        <div className="h-10 bg-slate-200 dark:bg-slate-700 rounded w-20"></div>
    </div>
);

const DashboardScreen: React.FC<DashboardScreenProps> = ({ onNavigate }) => {
    const [stats, setStats] = useState<DashboardSummary | null>(null);
    const [recentActivities, setRecentActivities] = useState<RecentActivity[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const colors = ['indigo', 'pink', 'blue', 'green', 'purple', 'orange'];

    const getInitials = (name: string) => {
        return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    };

    const formatActivityDate = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
    };

    const mapApprovalToActivity = (approval: ApprovalRequest, idx: number): RecentActivity => {
        const statusMap: Record<string, 'Pending' | 'Approved' | 'Rejected'> = {
            'PENDING': 'Pending',
            'pending': 'Pending',
            'APPROVED': 'Approved',
            'approved': 'Approved',
            'REJECTED': 'Rejected',
            'rejected': 'Rejected',
        };

        return {
            id: approval.id,
            name: approval.employeeName,
            initials: getInitials(approval.employeeName),
            color: colors[idx % colors.length],
            type: approval.type === 'OT' ? 'OT Request' : approval.type === 'LEAVE' ? 'Annual Leave' : 'Claim',
            date: formatActivityDate(approval.submittedAt),
            status: statusMap[approval.status] || 'Pending',
            actionIcon: approval.status === 'PENDING' || approval.status === 'pending' ? 'edit_square' : 'visibility',
        };
    };

    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);
                
                // Fetch stats and recent activities in parallel
                const [statsResponse, approvalsResponse] = await Promise.all([
                    api.stats.getSummary(),
                    api.approvals.getPending().catch(() => ({ success: false, data: [] })),
                ]);

                if (statsResponse.success && statsResponse.data) {
                    setStats(statsResponse.data);
                }

                // Map approvals to activities (limit to 5)
                if (approvalsResponse.success && approvalsResponse.data) {
                    const activities = approvalsResponse.data.slice(0, 5).map(mapApprovalToActivity);
                    setRecentActivities(activities);
                }
            } catch (err) {
                const message = err instanceof ApiError ? err.message : 'Failed to load dashboard';
                setError(message);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
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
        <div className="font-display bg-background-light dark:bg-background-dark text-slate-800 dark:text-slate-100 w-full">
            <div className="p-4 md:p-8 max-w-[1200px] mx-auto flex flex-col gap-8 pb-20">
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
                        <button 
                            onClick={() => onNavigate('Approvals')}
                            className="text-sm font-bold text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                        >
                            View All
                        </button>
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
                                    {loading ? (
                                        <tr>
                                            <td colSpan={5} className="px-6 py-8 text-center">
                                                <div className="flex justify-center">
                                                    <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
                                                </div>
                                            </td>
                                        </tr>
                                    ) : recentActivities.length === 0 ? (
                                        <tr>
                                            <td colSpan={5} className="px-6 py-8 text-center text-slate-500">
                                                <div className="flex flex-col items-center gap-2">
                                                    <span className="material-symbols-outlined text-3xl text-slate-300">inbox</span>
                                                    <p>No pending activities</p>
                                                </div>
                                            </td>
                                        </tr>
                                    ) : (
                                        recentActivities.map(activity => (
                                            <tr key={activity.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                                                <td className="px-6 py-4 font-medium text-slate-900 dark:text-white">
                                                    <div className="flex items-center gap-3">
                                                        <div className="size-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold">{activity.initials}</div>
                                                        {activity.name}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-slate-500">{activity.type}</td>
                                                <td className="px-6 py-4 text-slate-500">{activity.date}</td>
                                                <td className="px-6 py-4">
                                                    <StatusBadge status={activity.status} />
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <button 
                                                        onClick={() => onNavigate('Approvals')}
                                                        className="text-slate-400 hover:text-primary transition-colors"
                                                        title="View Details"
                                                    >
                                                        <span className="material-symbols-outlined">{activity.actionIcon}</span>
                                                    </button>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DashboardScreen;
