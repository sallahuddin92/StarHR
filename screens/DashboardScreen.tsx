
import React, { useState, useEffect } from 'react';
import { api, DashboardSummary, ApiError, ApprovalRequest, AttendanceRecord } from '../src/lib/api';
import { Screen } from '../App';

interface DashboardScreenProps {
    onNavigate: (screen: Screen) => void;
    userRole: string; // Added prop for reactivity
}

interface RecentActivity {
    id: string;
    name: string;
    initials: string;
    color: string;
    type: string;
    date: string;
    status: 'Pending' | 'Approved' | 'Rejected' | 'MissingPunch';
    actionIcon: string;
    isMissingPunch?: boolean;
    rawClockIn?: string;
}

const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
    const baseClasses = "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium";
    if (status === 'Pending') {
        return <span className={`${baseClasses} bg-orange-100 text-orange-700`}>Pending</span>;
    }
    if (status === 'Rejected') {
        return <span className={`${baseClasses} bg-red-100 text-red-700`}>Rejected</span>;
    }
    if (status === 'MissingPunch') {
        return <span className={`${baseClasses} bg-red-100 text-red-700`}>Missing Punch</span>;
    }
    return <span className={`${baseClasses} bg-green-100 text-green-700`}>Approved</span>;
};

const LoadingSkeleton: React.FC = () => (
    <div className="animate-pulse">
        <div className="h-10 bg-slate-200 dark:bg-slate-700 rounded w-20"></div>
    </div>
);

const DashboardScreen: React.FC<DashboardScreenProps> = ({ onNavigate, userRole }) => {
    const [stats, setStats] = useState<DashboardSummary | null>(null);
    const [recentActivities, setRecentActivities] = useState<RecentActivity[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [user, setUser] = useState<{ name: string; role: string; email: string } | null>(null);

    // Edit missing punch modal state
    const [editModalOpen, setEditModalOpen] = useState(false);
    const [editingActivity, setEditingActivity] = useState<RecentActivity | null>(null);
    const [clockOutInput, setClockOutInput] = useState('');
    const [remarksInput, setRemarksInput] = useState('');
    const [actionLoading, setActionLoading] = useState(false);
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

    const colors = ['indigo', 'pink', 'blue', 'green', 'purple', 'orange'];

    const getInitials = (name: string) => {
        return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    };

    const formatActivityDate = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
    };

    const formatTime = (isoString: string | null): string => {
        if (!isoString) return '--:--';
        const d = new Date(isoString);
        return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
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
            name: approval.employeeName || 'Unknown',
            initials: getInitials(approval.employeeName || '?'),
            color: colors[idx % colors.length],
            type: approval.type === 'OT' ? 'OT Request' : approval.type === 'LEAVE' ? 'Annual Leave' : 'Claim',
            date: formatActivityDate(approval.submittedAt),
            status: statusMap[approval.status] || 'Pending',
            actionIcon: approval.status === 'PENDING' ? 'edit_square' : 'visibility',
            isMissingPunch: false,
        };
    };

    const mapAttendanceToActivity = (record: AttendanceRecord, idx: number): RecentActivity => {
        return {
            id: record.id,
            name: record.full_name,
            initials: getInitials(record.full_name),
            color: colors[(idx + 3) % colors.length],
            type: 'Missing Punch',
            date: formatActivityDate(record.attendance_date),
            status: 'MissingPunch',
            actionIcon: 'edit',
            isMissingPunch: true,
            rawClockIn: record.raw_clock_in || undefined,
        };
    };

    const fetchData = async () => {
        try {
            setLoading(true);

            const statsResponse = await api.stats.getSummary();

            if (statsResponse.success && statsResponse.data) {
                setStats(statsResponse.data);
            }

            const [approvalsResponse, attendanceResponse] = await Promise.all([
                api.approvals.getPending().catch(() => ({ success: false, data: [] })),
                api.attendance.getAll().catch(() => ({ success: false, data: [] })),
            ]);

            const activities: RecentActivity[] = [];

            if (approvalsResponse.success && approvalsResponse.data) {
                const approvalActivities = approvalsResponse.data.slice(0, 3).map(mapApprovalToActivity);
                activities.push(...approvalActivities);
            }

            if (attendanceResponse.success && attendanceResponse.data) {
                const missingPunchRecords = attendanceResponse.data
                    .filter((r: AttendanceRecord) => r.raw_clock_out === null)
                    .slice(0, 3)
                    .map(mapAttendanceToActivity);
                activities.push(...missingPunchRecords);
            }

            setRecentActivities(activities.slice(0, 6));

        } catch (err) {
            const message = err instanceof ApiError ? err.message : 'Failed to load dashboard';
            setError(message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const userStr = localStorage.getItem('user');
        if (userStr) {
            try {
                const userData = JSON.parse(userStr);
                setUser({
                    name: userData.identifier || 'User',
                    role: userRole, // USE PROP INSTEAD OF LOCALSTORAGE
                    email: userData.email
                });
            } catch (e) {
                console.error("Failed to parse user", e);
            }
        }
        fetchData();
    }, [userRole]); // Re-fetch when role changes

    const handleOpenEditModal = (activity: RecentActivity) => {
        setEditingActivity(activity);
        if (activity.rawClockIn) {
            const clockIn = new Date(activity.rawClockIn);
            const defaultOut = new Date(clockIn);
            defaultOut.setHours(17, 0, 0, 0);
            const formatted = defaultOut.toISOString().slice(0, 16);
            setClockOutInput(formatted);
        } else {
            setClockOutInput('');
        }
        setRemarksInput('');
        setEditModalOpen(true);
    };

    const handleFixMissingPunch = async () => {
        if (!editingActivity || !clockOutInput) return;

        setActionLoading(true);
        try {
            const clockOutTime = new Date(clockOutInput).toISOString();
            const response = await api.attendance.fixMissingPunch(
                editingActivity.id,
                clockOutTime,
                remarksInput || undefined
            );

            if (response.success) {
                setToast({ message: 'Missing punch fixed successfully!', type: 'success' });
                setEditModalOpen(false);
                setEditingActivity(null);
                await fetchData();
            } else {
                setToast({ message: response.error || 'Failed to fix missing punch', type: 'error' });
            }
        } catch (err: any) {
            setToast({ message: err.message || 'Failed to fix missing punch', type: 'error' });
        } finally {
            setActionLoading(false);
            setTimeout(() => setToast(null), 3000);
        }
    };

    const handleActionClick = (activity: RecentActivity) => {
        if (activity.isMissingPunch) {
            handleOpenEditModal(activity);
        } else {
            onNavigate('Approvals');
        }
    };

    const formatPayrollDate = (dateStr: string | null) => {
        if (!dateStr) return '--';
        try {
            const date = new Date(dateStr);
            return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
        } catch { return '--'; }
    };

    const formatPayrollDay = (dateStr: string | null) => {
        if (!dateStr) return '';
        try {
            const date = new Date(dateStr);
            return date.toLocaleDateString('en-GB', { weekday: 'short' });
        } catch { return ''; }
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

    const roleDisplayName = userRole === 'HR_ADMIN' ? 'Admin' : userRole === 'MANAGER' ? 'Manager' : 'Employee';
    const welcomeMessage = user?.name ? `Selamat Datang, ${user.name}` : `Selamat Datang, ${roleDisplayName}`;

    // Dynamic Card Config based on Role
    const getCardConfig = () => {
        if (userRole === 'HR_ADMIN') {
            return {
                card1: { title: 'Total Employees', value: stats?.totalEmployees ?? 0, icon: 'group', color: 'text-slate-400', sub: (stats?.newEmployeesThisMonth ?? 0) > 0 ? `+${stats?.newEmployeesThisMonth} new` : null },
                card2: { title: 'Pending Actions', value: (stats?.pendingAttendance ?? 0) + (stats?.pendingEwa ?? 0), icon: 'pending_actions', color: 'text-orange-400', sub: 'requests' },
                card3: { title: 'Next Payroll', value: formatPayrollDate(stats?.nextPayrollDate || null), icon: 'payments', color: 'text-green-400', sub: getCutoffText(stats?.payrollCutoffDate || null) }
            };
        } else if (userRole === 'MANAGER') {
            return {
                card1: { title: 'My Team', value: stats?.totalEmployees ?? 0, icon: 'diversity_3', color: 'text-blue-400', sub: 'Active Members' },
                card2: { title: 'Team Requests', value: (stats?.pendingAttendance ?? 0), icon: 'rule', color: 'text-purple-400', sub: 'Pending Review' },
                card3: { title: 'Next Payroll', value: formatPayrollDate(stats?.nextPayrollDate || null), icon: 'payments', color: 'text-green-400', sub: 'Company Cycle' }
            };
        } else {
            // WORKER
            return {
                card1: { title: 'My Profile', value: 'Active', icon: 'badge', color: 'text-indigo-400', sub: 'Employment Status' },
                card2: { title: 'My Actions', value: (stats?.pendingAttendance ?? 0), icon: 'notifications_active', color: 'text-red-400', sub: 'Issues to fix' },
                card3: { title: 'Pay Day', value: formatPayrollDate(stats?.nextPayrollDate || null), icon: 'account_balance_wallet', color: 'text-emerald-400', sub: 'Expected Date' }
            };
        }
    };

    const cards = getCardConfig();

    return (
        <div className="font-display bg-background-light dark:bg-background-dark text-slate-800 dark:text-slate-100 w-full">
            <div className="p-4 md:p-8 max-w-[1200px] mx-auto flex flex-col gap-8 pb-20">

                {/* Visual Role Badge */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                    <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-3">
                            <h1 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-white tracking-tight">{welcomeMessage}</h1>
                            <span className={`px-2 py-1 rounded text-xs font-bold border ${userRole === 'HR_ADMIN' ? 'bg-purple-100 text-purple-700 border-purple-200' :
                                userRole === 'MANAGER' ? 'bg-blue-100 text-blue-700 border-blue-200' :
                                    'bg-green-100 text-green-700 border-green-200'
                                }`}>
                                {roleDisplayName.toUpperCase()} VIEW
                            </span>
                        </div>
                        <p className="text-slate-500 dark:text-slate-400">
                            {userRole === 'HR_ADMIN' && "Here's the executive overview of your HR operations."}
                            {userRole === 'MANAGER' && "Here's what your team is working on today."}
                            {userRole === 'WORKER' && "Your personal dashboard."}
                        </p>
                    </div>
                    <div className="text-sm text-slate-500 bg-white dark:bg-slate-800 px-4 py-2 rounded-full shadow-sm border border-slate-100 dark:border-slate-700 flex items-center gap-2">
                        <span className="material-symbols-outlined text-primary text-lg">calendar_today</span>
                        <span>Today: {new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* CARD 1 */}
                    <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col justify-between h-36 relative overflow-hidden group">
                        <div className="absolute right-0 top-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                            <span className={`material-symbols-outlined text-6xl ${cards.card1.color}`}>{cards.card1.icon}</span>
                        </div>
                        <div className="flex flex-col">
                            <p className="text-slate-500 dark:text-slate-400 text-sm font-medium uppercase tracking-wider">{cards.card1.title}</p>
                            <div className="flex items-baseline gap-2 mt-2">
                                {loading ? <LoadingSkeleton /> : (
                                    <>
                                        <h3 className="text-4xl font-bold text-slate-900 dark:text-white">{cards.card1.value}</h3>
                                        {cards.card1.sub && <span className="text-xs font-medium text-slate-500 bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded-full">{cards.card1.sub}</span>}
                                    </>
                                )}
                            </div>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-1.5 mt-auto">
                            <div className="bg-primary h-1.5 rounded-full" style={{ width: "85%" }}></div>
                        </div>
                    </div>

                    {/* CARD 2 */}
                    <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col justify-between h-36 relative overflow-hidden group">
                        <div className="absolute right-0 top-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                            <span className={`material-symbols-outlined text-6xl ${cards.card2.color}`}>{cards.card2.icon}</span>
                        </div>
                        <div className="flex flex-col">
                            <p className="text-slate-500 dark:text-slate-400 text-sm font-medium uppercase tracking-wider">{cards.card2.title}</p>
                            <div className="flex items-baseline gap-2 mt-2">
                                {loading ? <LoadingSkeleton /> : (
                                    <>
                                        <h3 className="text-4xl font-bold text-slate-900 dark:text-white">{cards.card2.value}</h3>
                                        <span className="text-sm text-slate-400">{cards.card2.sub}</span>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* CARD 3 */}
                    <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col justify-between h-36 relative overflow-hidden group">
                        <div className="absolute right-0 top-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                            <span className={`material-symbols-outlined text-6xl ${cards.card3.color}`}>{cards.card3.icon}</span>
                        </div>
                        <div className="flex flex-col">
                            <p className="text-slate-500 dark:text-slate-400 text-sm font-medium uppercase tracking-wider">{cards.card3.title}</p>
                            <div className="flex items-baseline gap-2 mt-2">
                                {loading ? <LoadingSkeleton /> : (
                                    <>
                                        <h3 className="text-4xl font-bold text-slate-900 dark:text-white">{cards.card3.value}</h3>
                                        <span className="text-sm text-slate-400">{cards.card3.sub}</span>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* RECENT ACTIVITIES TABLE */}
                <div className="flex flex-col gap-4">
                    <div className="flex items-center justify-between">
                        <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                            {userRole === 'WORKER' ? 'Your Recent Activity' : 'Recent Activities'}
                        </h2>
                        {userRole !== 'WORKER' && (
                            <button
                                onClick={() => onNavigate('Approvals')}
                                className="text-sm font-bold text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                            >
                                View All
                            </button>
                        )}
                    </div>
                    {/* ... (Table content unchanged) ... */}
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
                                                    <p>No activity to show</p>
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
                                                        onClick={() => handleActionClick(activity)}
                                                        className="text-slate-400 hover:text-primary transition-colors"
                                                        title={activity.isMissingPunch ? 'Fix Missing Punch' : 'View Details'}
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

            {/* Toast Notification */}
            {toast && (
                <div className={`fixed top-4 right-4 z-50 px-6 py-3 rounded-lg shadow-lg flex items-center gap-2 ${toast.type === 'success' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'}`}>
                    <span className="material-symbols-outlined text-sm">
                        {toast.type === 'success' ? 'check_circle' : 'error'}
                    </span>
                    {toast.message}
                </div>
            )}

            {/* Edit Missing Punch Modal */}
            {editModalOpen && editingActivity && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
                    {/* ... keeping modal content identical to reference ... */}
                    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-md mx-4 overflow-hidden">
                        <div className="p-6 border-b border-slate-200 dark:border-slate-700">
                            <div className="flex items-center justify-between">
                                <h2 className="text-xl font-bold text-slate-900 dark:text-white">Fix Missing Punch</h2>
                                <button
                                    onClick={() => { setEditModalOpen(false); setEditingActivity(null); }}
                                    className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full"
                                >
                                    <span className="material-symbols-outlined text-slate-400">close</span>
                                </button>
                            </div>
                        </div>
                        <div className="p-6 space-y-4">
                            <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-700/50 rounded-xl">
                                <div className="size-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-sm font-bold">{editingActivity.initials}</div>
                                <div>
                                    <p className="font-bold text-slate-900 dark:text-white">{editingActivity.name}</p>
                                    <p className="text-xs text-slate-500">{editingActivity.date}</p>
                                </div>
                            </div>
                            <div className="space-y-1">
                                <label className="text-sm font-medium text-slate-900 dark:text-white">Clock In</label>
                                <p className="text-slate-700 dark:text-slate-200 font-mono bg-slate-100 dark:bg-slate-700 px-3 py-2 rounded-lg">
                                    {editingActivity.rawClockIn ? formatTime(editingActivity.rawClockIn) : '--:--'}
                                </p>
                            </div>
                            <div className="space-y-1">
                                <label className="text-sm font-medium text-slate-900 dark:text-white">Clock Out Time *</label>
                                <input
                                    type="datetime-local"
                                    value={clockOutInput}
                                    onChange={(e) => setClockOutInput(e.target.value)}
                                    className="w-full h-10 px-3 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-sm font-medium text-slate-900 dark:text-white">Remarks (Optional)</label>
                                <textarea
                                    value={remarksInput}
                                    onChange={(e) => setRemarksInput(e.target.value)}
                                    placeholder="e.g., Confirmed with employee"
                                    rows={2}
                                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm focus:ring-2 focus:ring-primary focus:border-transparent outline-none resize-none"
                                />
                            </div>
                        </div>
                        <div className="p-6 border-t border-slate-200 dark:border-slate-700 flex gap-3">
                            <button
                                onClick={() => { setEditModalOpen(false); setEditingActivity(null); }}
                                className="flex-1 h-10 rounded-full border border-slate-200 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700 font-medium text-slate-700 dark:text-white transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleFixMissingPunch}
                                disabled={actionLoading || !clockOutInput}
                                className="flex-1 h-10 rounded-full bg-primary hover:bg-[#eae605] text-black font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                {actionLoading ? (
                                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-black border-t-transparent"></div>
                                ) : (
                                    <span className="material-symbols-outlined text-[18px]">check</span>
                                )}
                                Save
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DashboardScreen;
