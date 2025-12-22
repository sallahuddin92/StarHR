
import React, { useState, useEffect, useMemo } from 'react';
import { api } from '../src/lib/api';
import { Screen } from '../App';

interface AttendanceInterventionScreenProps {
    onNavigate: (screen: Screen) => void;
}

type AttendanceStatus = 'NORMAL' | 'MISSING_PUNCH' | 'PENDING_REVIEW' | 'OT_REJECTED';
type StatusFilter = 'ALL' | AttendanceStatus;

interface AttendanceRecord {
    id: string;
    name: string;
    empId: string;
    avatarUrl: string;
    date: string;
    rawTime: string;
    sysOT: number;
    verifiedOT: number;
    initialVerifiedOT: number;
    status: AttendanceStatus;
}

function deriveStatus(rawClockOut: string | null, otRequested: number, otApproved: number): AttendanceStatus {
    if (!rawClockOut) return 'MISSING_PUNCH';
    if (otRequested > 0 && otApproved === 0) return 'OT_REJECTED';
    if (otRequested !== otApproved) return 'PENDING_REVIEW';
    return 'NORMAL';
}

function formatTime(isoString: string | null): string {
    if (!isoString) return '--:--';
    const d = new Date(isoString);
    return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

function formatDate(dateString: string | null | undefined): string {
    if (!dateString) return '--';
    try {
        const d = new Date(dateString);
        if (isNaN(d.getTime())) return '--';
        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    } catch {
        return '--';
    }
}

function avatarUrl(seed: number): string {
    return `https://placehold.co/100x100`;
}

function safeNumber(val: any): number {
    const num = Number(val);
    return isNaN(num) ? 0 : num;
}

const StatusBadge: React.FC<{ status: AttendanceStatus }> = ({ status }) => {
    switch (status) {
        case 'NORMAL':
            return <span className="inline-flex items-center rounded-full bg-green-50 dark:bg-green-900/20 px-2.5 py-0.5 text-xs font-medium text-green-700 dark:text-green-400 ring-1 ring-inset ring-green-600/20">NORMAL</span>;
        case 'MISSING_PUNCH':
            return <span className="inline-flex items-center rounded-full bg-red-50 dark:bg-red-900/20 px-2.5 py-0.5 text-xs font-medium text-red-700 dark:text-red-400 ring-1 ring-inset ring-red-600/10">MISSING_PUNCH</span>;
        case 'PENDING_REVIEW':
            return <span className="inline-flex items-center rounded-full bg-gray-100 dark:bg-gray-800 px-2.5 py-0.5 text-xs font-medium text-gray-600 dark:text-gray-300 ring-1 ring-inset ring-gray-500/10">PENDING_REVIEW</span>;
        case 'OT_REJECTED':
            return <span className="inline-flex items-center rounded-full bg-gray-100 dark:bg-gray-800 px-2.5 py-0.5 text-xs font-medium text-gray-500 dark:text-gray-400 ring-1 ring-inset ring-gray-500/10">OT_REJECTED</span>;
    }
};

const AttendanceInterventionScreen: React.FC<AttendanceInterventionScreenProps> = ({ onNavigate }) => {
    const [records, setRecords] = useState<AttendanceRecord[]>([]);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [stats, setStats] = useState({ pending: 0, approved: 0, errors: 0 });
    
    // Filter states
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
    const [showErrorsOnly, setShowErrorsOnly] = useState(false);
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
    const [actionLoading, setActionLoading] = useState(false);

    useEffect(() => {
        async function fetchAttendance() {
            try {
                setLoading(true);
                const response = await api.attendance.getAll();
                const rows = response.data || [];
                const mapped: AttendanceRecord[] = rows.map((row: any, idx: number) => {
                    const sysOT = safeNumber(row.ot_requested_hours);
                    const verifiedOT = safeNumber(row.ot_approved_hours);
                    const status = deriveStatus(row.raw_clock_out, sysOT, verifiedOT);
                    const rawIn = formatTime(row.raw_clock_in);
                    const rawOut = formatTime(row.raw_clock_out);
                    return {
                        id: row.id || `row-${idx}`,
                        name: row.full_name || 'Unknown',
                        empId: row.emp_code || row.employee_id || 'N/A',
                        avatarUrl: avatarUrl(idx),
                        date: formatDate(row.attendance_date),
                        rawTime: `${rawIn} – ${rawOut}`,
                        sysOT,
                        verifiedOT,
                        initialVerifiedOT: verifiedOT,
                        status,
                    };
                });
                setRecords(mapped);

                const pending = mapped.filter(r => r.status === 'PENDING_REVIEW').length;
                const approved = mapped.filter(r => r.status === 'NORMAL').length;
                const errors = mapped.filter(r => r.status === 'MISSING_PUNCH' || r.status === 'OT_REJECTED').length;
                setStats({ pending, approved, errors });
            } catch (err: any) {
                setError(err.message || 'Failed to load attendance data');
            } finally {
                setLoading(false);
            }
        }
        fetchAttendance();
    }, []);

    const handleSelect = (id: string) => {
        setSelectedIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const allSelected = records.length > 0 && selectedIds.size === records.length;
    const handleSelectAll = () => {
        if (allSelected) setSelectedIds(new Set());
        else setSelectedIds(new Set(records.map(r => r.id)));
    };

    const handleOtChange = (id: string, value: string) => {
        const num = parseFloat(value) || 0;
        setRecords(prev => prev.map(r => r.id === id ? { ...r, verifiedOT: num } : r));
    };

    // Filtered records based on search, status filter, and errors-only toggle
    const filteredRecords = useMemo(() => {
        return records.filter(r => {
            // Search filter
            const matchesSearch = searchQuery === '' || 
                r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                r.empId.toLowerCase().includes(searchQuery.toLowerCase());
            
            // Status filter
            const matchesStatus = statusFilter === 'ALL' || r.status === statusFilter;
            
            // Errors only toggle
            const matchesErrorsOnly = !showErrorsOnly || 
                r.status === 'MISSING_PUNCH' || r.status === 'OT_REJECTED';
            
            return matchesSearch && matchesStatus && matchesErrorsOnly;
        });
    }, [records, searchQuery, statusFilter, showErrorsOnly]);

    // Handle undo single record
    const handleUndo = (id: string) => {
        setRecords(prev => prev.map(r => 
            r.id === id ? { ...r, verifiedOT: r.initialVerifiedOT } : r
        ));
    };

    // Handle approve single record
    const handleApproveSingle = async (id: string) => {
        const record = records.find(r => r.id === id);
        if (!record) return;
        
        setActionLoading(true);
        try {
            await api.attendance.approveOT(id, record.verifiedOT);
            setRecords(prev => prev.map(r => 
                r.id === id ? { ...r, status: 'NORMAL' as AttendanceStatus, initialVerifiedOT: r.verifiedOT } : r
            ));
            setToast({ message: 'OT approved successfully', type: 'success' });
        } catch (err: any) {
            setToast({ message: err.message || 'Failed to approve', type: 'error' });
        } finally {
            setActionLoading(false);
            setTimeout(() => setToast(null), 3000);
        }
    };

    // Handle batch approve
    const handleBatchApprove = async () => {
        if (selectedIds.size === 0) return;
        
        setActionLoading(true);
        let successCount = 0;
        let failCount = 0;
        
        for (const id of selectedIds) {
            const record = records.find(r => r.id === id);
            if (!record) continue;
            
            try {
                await api.attendance.approveOT(id, record.verifiedOT);
                successCount++;
            } catch {
                failCount++;
            }
        }
        
        // Refresh data after batch operation
        if (successCount > 0) {
            setRecords(prev => prev.map(r => 
                selectedIds.has(r.id) ? { ...r, status: 'NORMAL' as AttendanceStatus, initialVerifiedOT: r.verifiedOT } : r
            ));
            setSelectedIds(new Set());
        }
        
        setActionLoading(false);
        setToast({ 
            message: `Approved ${successCount} records${failCount > 0 ? `, ${failCount} failed` : ''}`, 
            type: failCount > 0 ? 'error' : 'success' 
        });
        setTimeout(() => setToast(null), 3000);
    };

    // Handle reset changes for selected records
    const handleResetChanges = () => {
        setRecords(prev => prev.map(r => 
            selectedIds.has(r.id) ? { ...r, verifiedOT: r.initialVerifiedOT } : r
        ));
        setToast({ message: 'Changes reset', type: 'success' });
        setTimeout(() => setToast(null), 3000);
    };

    if (loading) {
        return (
            <div className="flex w-full justify-center py-12 bg-background-light dark:bg-background-dark">
                <div className="flex flex-col items-center gap-4">
                    <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
                    <p className="text-[#8c8b5f]">Loading attendance records...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex w-full justify-center py-12 bg-background-light dark:bg-background-dark">
                <div className="flex flex-col items-center gap-4 text-center">
                    <span className="material-symbols-outlined text-red-500 text-5xl">error</span>
                    <p className="text-red-600 dark:text-red-400 font-medium">{error}</p>
                    <button 
                        onClick={() => window.location.reload()} 
                        className="px-4 py-2 rounded-full bg-primary text-black font-medium hover:bg-[#eae605]"
                    >
                        Retry
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-background-light dark:bg-background-dark font-display text-[#181811] dark:text-[#e6e6db]">
            {/* Toast Notification */}
            {toast && (
                <div className={`fixed top-4 right-4 z-50 px-6 py-3 rounded-lg shadow-lg flex items-center gap-2 ${
                    toast.type === 'success' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
                }`}>
                    <span className="material-symbols-outlined text-sm">
                        {toast.type === 'success' ? 'check_circle' : 'error'}
                    </span>
                    {toast.message}
                </div>
            )}
            
            <div className="max-w-[1400px] mx-auto w-full p-4 md:p-8 flex flex-col gap-6">
                <div className="flex flex-col gap-6">
                    <div className="flex items-center gap-2 text-sm">
                        <button onClick={() => onNavigate('Dashboard')} className="text-[#8c8b5f] hover:text-primary transition-colors font-medium">Home</button>
                        <span className="text-[#8c8b5f] material-symbols-outlined text-[16px]">chevron_right</span>
                        <span className="text-[#8c8b5f] font-medium">Attendance</span>
                        <span className="text-[#8c8b5f] material-symbols-outlined text-[16px]">chevron_right</span>
                        <span className="text-[#181811] dark:text-white font-semibold">Intervention</span>
                    </div>
                    <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                        <div className="flex flex-col gap-1">
                            <h1 className="text-[#181811] dark:text-white tracking-tight text-3xl font-bold leading-tight">Attendance Intervention</h1>
                            <p className="text-[#8c8b5f] text-base font-normal">Audit and correct employee attendance records for payroll processing.</p>
                        </div>
                        <div className="flex gap-4 overflow-x-auto pb-1 md:pb-0">
                            <div className="flex min-w-[140px] flex-col gap-1 rounded-xl p-4 border border-[#e6e6db] dark:border-[#3a3a30] bg-white dark:bg-surface-dark shadow-sm">
                                <div className="flex items-center justify-between">
                                    <p className="text-[#8c8b5f] text-xs font-semibold uppercase tracking-wider">Pending</p>
                                    <span className="material-symbols-outlined text-amber-500 text-[20px]">pending</span>
                                </div>
                                <p className="text-[#181811] dark:text-white text-2xl font-bold">{stats.pending}</p>
                            </div>
                            <div className="flex min-w-[140px] flex-col gap-1 rounded-xl p-4 border border-[#e6e6db] dark:border-[#3a3a30] bg-white dark:bg-surface-dark shadow-sm">
                                <div className="flex items-center justify-between">
                                    <p className="text-[#8c8b5f] text-xs font-semibold uppercase tracking-wider">Auto-Approved</p>
                                    <span className="material-symbols-outlined text-green-600 text-[20px]">check_circle</span>
                                </div>
                                <p className="text-[#181811] dark:text-white text-2xl font-bold">{stats.approved}</p>
                            </div>
                            <div className="flex min-w-[140px] flex-col gap-1 rounded-xl p-4 border border-[#e6e6db] dark:border-[#3a3a30] bg-white dark:bg-surface-dark shadow-sm">
                                <div className="flex items-center justify-between">
                                    <p className="text-[#8c8b5f] text-xs font-semibold uppercase tracking-wider">Errors</p>
                                    <span className="material-symbols-outlined text-red-500 text-[20px]">error</span>
                                </div>
                                <p className="text-[#181811] dark:text-white text-2xl font-bold">{stats.errors}</p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex flex-col gap-6">
                    <div className="flex flex-col lg:flex-row gap-4 justify-between items-start lg:items-center">
                        <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
                            <div className="relative w-full md:w-64">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-[#8c8b5f]">search</span>
                                <input 
                                    className="w-full h-10 pl-10 pr-4 rounded-full border border-[#e6e6db] dark:border-[#3a3a30] bg-white dark:bg-surface-dark text-sm focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all placeholder:text-[#8c8b5f]" 
                                    placeholder="Search Employee Name or ID" 
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                            </div>
                            <div className="h-8 w-[1px] bg-[#e6e6db] dark:bg-[#3a3a30] hidden md:block"></div>
                            <div className="flex gap-2 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
                                <select 
                                    className="h-9 rounded-full border border-[#e6e6db] dark:border-[#3a3a30] bg-white dark:bg-surface-dark px-4 text-sm font-medium hover:border-primary transition-colors appearance-none cursor-pointer"
                                    value={statusFilter}
                                    onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
                                >
                                    <option value="ALL">Status: All</option>
                                    <option value="NORMAL">Normal</option>
                                    <option value="PENDING_REVIEW">Pending Review</option>
                                    <option value="MISSING_PUNCH">Missing Punch</option>
                                    <option value="OT_REJECTED">OT Rejected</option>
                                </select>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <label className="flex items-center cursor-pointer">
                                <div className="relative">
                                    <input 
                                        type="checkbox" 
                                        className="sr-only peer"
                                        checked={showErrorsOnly}
                                        onChange={(e) => setShowErrorsOnly(e.target.checked)}
                                    />
                                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                                </div>
                                <span className="ms-3 text-sm font-medium text-gray-900 dark:text-gray-300">Show Errors Only</span>
                            </label>
                        </div>
                    </div>

                    <div className="w-full overflow-hidden rounded-xl border border-[#e6e6db] dark:border-[#3a3a30] bg-white dark:bg-surface-dark shadow-sm flex flex-col">
                        <div className="overflow-auto">
                            <table className="w-full text-left border-collapse">
                                <thead className="bg-[#f8f8f5] dark:bg-[#23220f] sticky top-0 z-10 text-[#5c5b4f] dark:text-gray-400 text-xs uppercase tracking-wider font-semibold shadow-[0_1px_2px_rgba(0,0,0,0.05)]">
                                    <tr>
                                        <th className="p-4 w-12 text-center">
                                            <input type="checkbox" onChange={handleSelectAll} checked={allSelected} className="rounded border-gray-300 text-primary focus:ring-primary bg-white dark:bg-gray-700 dark:border-gray-600" />
                                        </th>
                                        <th className="p-4 min-w-[240px]">Employee Info</th>
                                        <th className="p-4 min-w-[120px]">Date</th>
                                        <th className="p-4 min-w-[140px]">Raw Time (In/Out)</th>
                                        <th className="p-4 min-w-[100px] text-right">Sys OT</th>
                                        <th className="p-4 min-w-[140px] text-right">Verified OT</th>
                                        <th className="p-4 min-w-[140px]">Status</th>
                                        <th className="p-4 min-w-[100px] text-center">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[#e6e6db] dark:divide-[#3a3a30] text-sm">
                                    {filteredRecords.length === 0 ? (
                                        <tr>
                                            <td colSpan={8} className="p-8 text-center text-[#8c8b5f]">
                                                <div className="flex flex-col items-center gap-2">
                                                    <span className="material-symbols-outlined text-3xl">search_off</span>
                                                    <p>No records found matching your filters</p>
                                                </div>
                                            </td>
                                        </tr>
                                    ) : filteredRecords.map(rec => {
                                        const isEdited = rec.verifiedOT !== rec.initialVerifiedOT;
                                        const rowClasses = rec.status === 'MISSING_PUNCH' ? 'bg-red-50/30 dark:bg-red-900/5' : 'group hover:bg-[#fafaf7] dark:hover:bg-[#323229]';

                                        return (
                                            <tr key={rec.id} className={`${rowClasses} transition-colors`}>
                                                <td className="p-4 text-center">
                                                    <input type="checkbox" checked={selectedIds.has(rec.id)} onChange={() => handleSelect(rec.id)} className="rounded border-gray-300 text-primary focus:ring-primary bg-white dark:bg-gray-700 dark:border-gray-600" />
                                                </td>
                                                <td className="p-4">
                                                    <div className="flex items-center gap-3">
                                                        <img src={rec.avatarUrl} className="h-10 w-10 rounded-full object-cover border border-gray-200" alt={rec.name} />
                                                        <div className="flex flex-col">
                                                            <span className="font-bold text-[#181811] dark:text-white">{rec.name}</span>
                                                            <span className="text-xs text-[#8c8b5f]">ID: {rec.empId}</span>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="p-4 text-[#181811] dark:text-gray-200">{rec.date}</td>
                                                <td className={`p-4 font-mono ${rec.status === 'MISSING_PUNCH' ? 'text-red-600 dark:text-red-400 font-medium' : 'text-[#5c5b4f] dark:text-gray-400'}`}>
                                                    {rec.rawTime}
                                                </td>
                                                <td className="p-4 text-right font-medium text-[#181811] dark:text-gray-200">{(rec.sysOT ?? 0).toFixed(1)}</td>
                                                <td className="p-4 text-right">
                                                    <div className={`relative inline-block ${isEdited ? 'animate-pulse' : ''}`}>
                                                        <input 
                                                            type="number" 
                                                            value={(rec.verifiedOT ?? 0).toFixed(1)} 
                                                            onChange={(e) => handleOtChange(rec.id, e.target.value)} 
                                                            className={`w-20 text-right p-1.5 rounded-lg transition-all font-medium ${isEdited ? 'border border-yellow-300 bg-primary/10 dark:bg-yellow-900/30 dark:border-yellow-700 text-yellow-900 dark:text-yellow-200 font-bold' : 'border border-transparent bg-transparent hover:border-[#e6e6db] dark:hover:border-gray-600 focus:bg-white dark:focus:bg-gray-800 focus:border-primary focus:ring-1 focus:ring-primary outline-none'}`}
                                                        />
                                                        {isEdited && <div className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-primary"></div>}
                                                    </div>
                                                </td>
                                                <td className="p-4"><StatusBadge status={rec.status} /></td>
                                                <td className="p-4 text-center">
                                                    <div className="flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        {rec.status === 'PENDING_REVIEW' && isEdited ? (
                                                            <>
                                                                <button 
                                                                    onClick={() => handleUndo(rec.id)}
                                                                    className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full text-[#8c8b5f] hover:text-red-500" 
                                                                    title="Undo Changes"
                                                                    disabled={actionLoading}
                                                                >
                                                                    <span className="material-symbols-outlined text-[20px]">undo</span>
                                                                </button>
                                                                <button 
                                                                    onClick={() => handleApproveSingle(rec.id)}
                                                                    className="p-1.5 hover:bg-primary/20 rounded-full text-green-600" 
                                                                    title="Approve"
                                                                    disabled={actionLoading}
                                                                >
                                                                    <span className="material-symbols-outlined text-[20px]">check</span>
                                                                </button>
                                                            </>
                                                        ) : rec.status === 'MISSING_PUNCH' ? (
                                                            <button 
                                                                className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full text-primary" 
                                                                title="Fix Record (Coming Soon)"
                                                            >
                                                                <span className="material-symbols-outlined text-[20px] fill">edit</span>
                                                            </button>
                                                        ) : (
                                                            <button 
                                                                className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full text-[#8c8b5f]" 
                                                                title="View Logs"
                                                            >
                                                                <span className="material-symbols-outlined text-[20px]">visibility</span>
                                                            </button>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                        <div className="flex items-center justify-between p-4 border-t border-[#e6e6db] dark:border-[#3a3a30] bg-[#fafaf7] dark:bg-[#23220f] text-sm text-[#8c8b5f]">
                            <div>Showing {filteredRecords.length} of {records.length} record{records.length !== 1 ? 's' : ''}</div>
                            <div className="flex items-center gap-2">
                                {searchQuery || statusFilter !== 'ALL' || showErrorsOnly ? (
                                    <button 
                                        onClick={() => { setSearchQuery(''); setStatusFilter('ALL'); setShowErrorsOnly(false); }}
                                        className="text-primary hover:underline text-sm"
                                    >
                                        Clear filters
                                    </button>
                                ) : null}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {selectedIds.size > 0 && (
                <div className="bg-white dark:bg-surface-dark border-t border-[#e6e6db] dark:border-[#3a3a30] p-4 px-6 md:px-10 z-30 shadow-[0_-4px_20px_-5px_rgba(0,0,0,0.1)]">
                    <div className="max-w-[1400px] mx-auto w-full flex flex-col md:flex-row justify-between items-center gap-4">
                        <div className="flex items-center gap-3">
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-black dark:bg-white text-white dark:text-black font-bold text-sm">{selectedIds.size}</div>
                            <span className="text-[#181811] dark:text-white font-medium">records selected</span>
                            <span className="text-[#8c8b5f] hidden md:inline">|</span>
                            <button onClick={() => setSelectedIds(new Set())} className="text-[#8c8b5f] hover:text-[#181811] dark:hover:text-white underline text-sm">Unselect all</button>
                        </div>
                        <div className="flex items-center gap-3 w-full md:w-auto">
                            <button 
                                onClick={handleResetChanges}
                                disabled={actionLoading}
                                className="flex-1 md:flex-none h-10 px-6 rounded-full border border-[#e6e6db] dark:border-[#3a3a30] hover:bg-gray-50 dark:hover:bg-gray-700 font-medium text-[#181811] dark:text-white transition-colors disabled:opacity-50"
                            >
                                Reset Changes
                            </button>
                            <button 
                                onClick={handleBatchApprove}
                                disabled={actionLoading}
                                className="flex-1 md:flex-none h-10 px-6 rounded-full bg-primary hover:bg-[#eae605] text-black font-semibold transition-colors shadow-sm flex items-center justify-center gap-2 disabled:opacity-50"
                            >
                                {actionLoading ? (
                                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-black border-t-transparent"></div>
                                ) : (
                                    <span className="material-symbols-outlined text-[18px]">done_all</span>
                                )}
                                Batch Approve
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AttendanceInterventionScreen;
