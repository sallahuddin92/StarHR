
import React, { useState, useMemo, useEffect } from 'react';

type AttendanceStatus = 'NORMAL' | 'MISSING_PUNCH' | 'PENDING_REVIEW' | 'OT_REJECTED';

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

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001';

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

function formatDate(dateString: string): string {
    const d = new Date(dateString);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function avatarUrl(seed: number): string {
    return `https://picsum.photos/id/${1005 + (seed % 30)}/100/100`;
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


const AttendanceInterventionScreen: React.FC = () => {
    const [records, setRecords] = useState<AttendanceRecord[]>([]);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [stats, setStats] = useState({ pending: 0, approved: 0, errors: 0 });

    useEffect(() => {
        async function fetchAttendance() {
            try {
                setLoading(true);
                const token = localStorage.getItem('authToken');
                if (!token) {
                    setError('Not authenticated');
                    return;
                }

                const res = await fetch(`${API_BASE}/api/attendance`, {
                    headers: { Authorization: `Bearer ${token}` },
                });

                if (!res.ok) {
                    throw new Error(`Failed to fetch attendance: ${res.status}`);
                }

                const json = await res.json();
                const rows = json.data || [];
                const mapped: AttendanceRecord[] = rows.map((row: any, idx: number) => {
                    const status = deriveStatus(row.raw_clock_out, row.ot_requested_hours || 0, row.ot_approved_hours || 0);
                    const rawIn = formatTime(row.raw_clock_in);
                    const rawOut = formatTime(row.raw_clock_out);
                    return {
                        id: row.id,
                        name: row.full_name || 'Unknown',
                        empId: row.emp_code || row.employee_id,
                        avatarUrl: avatarUrl(idx),
                        date: formatDate(row.attendance_date),
                        rawTime: `${rawIn} - ${rawOut}`,
                        sysOT: row.ot_requested_hours || 0,
                        verifiedOT: row.ot_approved_hours ?? row.ot_requested_hours ?? 0,
                        initialVerifiedOT: row.ot_approved_hours ?? row.ot_requested_hours ?? 0,
                        status,
                    };
                });

                setRecords(mapped);

                // Compute stats
                const pending = mapped.filter(r => r.status === 'PENDING_REVIEW' || r.status === 'MISSING_PUNCH').length;
                const errors = mapped.filter(r => r.status === 'MISSING_PUNCH').length;
                const approved = mapped.filter(r => r.status === 'NORMAL').length;
                setStats({ pending, approved, errors });

            } catch (err: any) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        }

        fetchAttendance();
    }, []);

    const handleSelect = (id: string) => {
        const newSelectedIds = new Set(selectedIds);
        if (newSelectedIds.has(id)) {
            newSelectedIds.delete(id);
        } else {
            newSelectedIds.add(id);
        }
        setSelectedIds(newSelectedIds);
    };

    const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.checked) {
            setSelectedIds(new Set(records.map(r => r.id)));
        } else {
            setSelectedIds(new Set());
        }
    };

    const handleOtChange = (id: string, value: string) => {
        setRecords(records.map(rec => rec.id === id ? { ...rec, verifiedOT: parseFloat(value) || 0 } : rec));
    };
    
    const allSelected = useMemo(() => records.length > 0 && selectedIds.size === records.length, [records, selectedIds]);

    if (loading) {
        return (
            <div className="flex h-screen w-full items-center justify-center bg-background-light dark:bg-background-dark">
                <div className="flex flex-col items-center gap-4">
                    <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
                    <p className="text-[#8c8b5f]">Loading attendance records...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex h-screen w-full items-center justify-center bg-background-light dark:bg-background-dark">
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
        <div className="flex h-screen w-full flex-col bg-background-light dark:bg-background-dark font-display text-[#181811] dark:text-[#e6e6db] overflow-hidden">
            <header className="flex-none px-6 py-5 md:px-10 border-b border-[#e6e6db] dark:border-[#3a3a30] bg-background-light dark:bg-background-dark z-20">
                <div className="max-w-[1400px] mx-auto w-full flex flex-col gap-6">
                    <div className="flex items-center gap-2 text-sm">
                        <a className="text-[#8c8b5f] hover:text-primary transition-colors font-medium" href="#">Home</a>
                        <span className="text-[#8c8b5f] material-symbols-outlined text-[16px]">chevron_right</span>
                        <a className="text-[#8c8b5f] hover:text-primary transition-colors font-medium" href="#">Attendance</a>
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
                                <div className="flex items-center justify-between"><p className="text-[#8c8b5f] text-xs font-semibold uppercase tracking-wider">Pending</p><span className="material-symbols-outlined text-amber-500 text-[20px]">pending</span></div>
                                <p className="text-[#181811] dark:text-white text-2xl font-bold">{stats.pending}</p>
                            </div>
                            <div className="flex min-w-[140px] flex-col gap-1 rounded-xl p-4 border border-[#e6e6db] dark:border-[#3a3a30] bg-white dark:bg-surface-dark shadow-sm">
                                <div className="flex items-center justify-between"><p className="text-[#8c8b5f] text-xs font-semibold uppercase tracking-wider">Auto-Approved</p><span className="material-symbols-outlined text-green-600 text-[20px]">check_circle</span></div>
                                <p className="text-[#181811] dark:text-white text-2xl font-bold">{stats.approved}</p>
                            </div>
                            <div className="flex min-w-[140px] flex-col gap-1 rounded-xl p-4 border border-[#e6e6db] dark:border-[#3a3a30] bg-white dark:bg-surface-dark shadow-sm">
                                <div className="flex items-center justify-between"><p className="text-[#8c8b5f] text-xs font-semibold uppercase tracking-wider">Errors</p><span className="material-symbols-outlined text-red-500 text-[20px]">error</span></div>
                                <p className="text-[#181811] dark:text-white text-2xl font-bold">{stats.errors}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </header>
            
            <main className="flex-1 flex flex-col px-6 md:px-10 py-6 overflow-hidden max-w-[1400px] mx-auto w-full">
                <div className="flex flex-col lg:flex-row gap-4 justify-between items-start lg:items-center mb-4 flex-none">
                     <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
                        <div className="relative w-full md:w-64">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-[#8c8b5f]">search</span>
                            <input className="w-full h-10 pl-10 pr-4 rounded-full border border-[#e6e6db] dark:border-[#3a3a30] bg-white dark:bg-surface-dark text-sm focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all placeholder:text-[#8c8b5f]" placeholder="Search Employee Name or ID" type="text" />
                        </div>
                        <div className="h-8 w-[1px] bg-[#e6e6db] dark:bg-[#3a3a30] hidden md:block"></div>
                        <div className="flex gap-2 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
                            <button className="flex h-9 items-center gap-2 rounded-full border border-[#e6e6db] dark:border-[#3a3a30] bg-white dark:bg-surface-dark px-4 hover:border-primary transition-colors whitespace-nowrap"><span className="text-sm font-medium">Dept: All</span><span className="material-symbols-outlined text-sm">expand_more</span></button>
                            <button className="flex h-9 items-center gap-2 rounded-full border border-[#e6e6db] dark:border-[#3a3a30] bg-white dark:bg-surface-dark px-4 hover:border-primary transition-colors whitespace-nowrap"><span className="text-sm font-medium">Date: This Week</span><span className="material-symbols-outlined text-sm">calendar_today</span></button>
                            <button className="flex h-9 items-center gap-2 rounded-full border border-[#e6e6db] dark:border-[#3a3a30] bg-white dark:bg-surface-dark px-4 hover:border-primary transition-colors whitespace-nowrap"><span className="text-sm font-medium">Status: All</span><span className="material-symbols-outlined text-sm">filter_list</span></button>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <label className="flex items-center cursor-pointer">
                            <div className="relative"><input type="checkbox" className="sr-only peer" /><div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div></div>
                            <span className="ms-3 text-sm font-medium text-gray-900 dark:text-gray-300">Show Errors Only</span>
                        </label>
                    </div>
                </div>

                <div className="flex-1 w-full overflow-hidden rounded-xl border border-[#e6e6db] dark:border-[#3a3a30] bg-white dark:bg-surface-dark shadow-sm flex flex-col">
                    <div className="overflow-auto flex-1">
                        <table className="w-full text-left border-collapse">
                            <thead className="bg-[#f8f8f5] dark:bg-[#23220f] sticky top-0 z-10 text-[#5c5b4f] dark:text-gray-400 text-xs uppercase tracking-wider font-semibold shadow-[0_1px_2px_rgba(0,0,0,0.05)]">
                                <tr>
                                    <th className="p-4 w-12 text-center"><input type="checkbox" onChange={handleSelectAll} checked={allSelected} className="rounded border-gray-300 text-primary focus:ring-primary bg-white dark:bg-gray-700 dark:border-gray-600" /></th>
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
                                {records.map(rec => {
                                    const isEdited = rec.verifiedOT !== rec.initialVerifiedOT;
                                    const rowClasses = rec.status === 'MISSING_PUNCH' ? 'bg-red-50/30 dark:bg-red-900/5' : 'group hover:bg-[#fafaf7] dark:hover:bg-[#323229]';

                                    return (
                                        <tr key={rec.id} className={`${rowClasses} transition-colors`}>
                                            <td className="p-4 text-center"><input type="checkbox" checked={selectedIds.has(rec.id)} onChange={() => handleSelect(rec.id)} className="rounded border-gray-300 text-primary focus:ring-primary bg-white dark:bg-gray-700 dark:border-gray-600" /></td>
                                            <td className="p-4"><div className="flex items-center gap-3"><img src={rec.avatarUrl} className="h-10 w-10 rounded-full object-cover border border-gray-200" /><div className="flex flex-col"><span className="font-bold text-[#181811] dark:text-white">{rec.name}</span><span className="text-xs text-[#8c8b5f]">ID: {rec.empId}</span></div></div></td>
                                            <td className="p-4 text-[#181811] dark:text-gray-200">{rec.date}</td>
                                            <td className={`p-4 font-mono ${rec.status === 'MISSING_PUNCH' ? 'text-red-600 dark:text-red-400 font-medium' : 'text-[#5c5b4f] dark:text-gray-400'}`}>{rec.rawTime}</td>
                                            <td className="p-4 text-right font-medium text-[#181811] dark:text-gray-200">{rec.sysOT.toFixed(1)}</td>
                                            <td className="p-4 text-right">
                                                <div className={`relative inline-block ${isEdited ? 'animate-pulse' : ''}`}>
                                                  <input type="number" value={rec.verifiedOT.toFixed(1)} onChange={(e) => handleOtChange(rec.id, e.target.value)} className={`w-20 text-right p-1.5 rounded-lg transition-all font-medium ${isEdited ? 'border border-yellow-300 bg-primary/10 dark:bg-yellow-900/30 dark:border-yellow-700 text-yellow-900 dark:text-yellow-200 font-bold' : 'border border-transparent bg-transparent hover:border-[#e6e6db] dark:hover:border-gray-600 focus:bg-white dark:focus:bg-gray-800 focus:border-primary focus:ring-1 focus:ring-primary outline-none'}`}/>
                                                  {isEdited && <div className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-primary"></div>}
                                                </div>
                                            </td>
                                            <td className="p-4"><StatusBadge status={rec.status} /></td>
                                            <td className="p-4 text-center">
                                                <div className="flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    {rec.status === 'PENDING_REVIEW' && isEdited ? (
                                                        <>
                                                            <button className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full text-[#8c8b5f] hover:text-red-500" title="Undo Changes"><span className="material-symbols-outlined text-[20px]">undo</span></button>
                                                            <button className="p-1.5 hover:bg-primary/20 rounded-full text-green-600" title="Approve"><span className="material-symbols-outlined text-[20px]">check</span></button>
                                                        </>
                                                    ) : rec.status === 'MISSING_PUNCH' ? (
                                                        <button className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full text-primary" title="Fix Record"><span className="material-symbols-outlined text-[20px] fill">edit</span></button>
                                                    ) : (
                                                        <button className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full text-[#8c8b5f]" title="View Logs"><span className="material-symbols-outlined text-[20px]">visibility</span></button>
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
                        <div>Showing {records.length} record{records.length !== 1 ? 's' : ''}</div>
                        <div className="flex gap-2"><button className="px-3 py-1 rounded-lg border border-[#e6e6db] dark:border-[#3a3a30] bg-white dark:bg-surface-dark hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50" disabled>Prev</button><button className="px-3 py-1 rounded-lg border border-[#e6e6db] dark:border-[#3a3a30] bg-white dark:bg-surface-dark hover:bg-gray-50 dark:hover:bg-gray-800">Next</button></div>
                    </div>
                </div>
            </main>
            
            {selectedIds.size > 0 && (
                <div className="flex-none bg-white dark:bg-surface-dark border-t border-[#e6e6db] dark:border-[#3a3a30] p-4 px-6 md:px-10 z-30 shadow-[0_-4px_20px_-5px_rgba(0,0,0,0.1)]">
                    <div className="max-w-[1400px] mx-auto w-full flex flex-col md:flex-row justify-between items-center gap-4">
                        <div className="flex items-center gap-3">
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-black dark:bg-white text-white dark:text-black font-bold text-sm">{selectedIds.size}</div>
                            <span className="text-[#181811] dark:text-white font-medium">records selected</span>
                            <span className="text-[#8c8b5f] hidden md:inline">|</span>
                            <button onClick={() => setSelectedIds(new Set())} className="text-[#8c8b5f] hover:text-[#181811] dark:hover:text-white underline text-sm">Unselect all</button>
                        </div>
                        <div className="flex items-center gap-3 w-full md:w-auto">
                            <button className="flex-1 md:flex-none h-10 px-6 rounded-full border border-[#e6e6db] dark:border-[#3a3a30] hover:bg-gray-50 dark:hover:bg-gray-700 font-medium text-[#181811] dark:text-white transition-colors">Reset Changes</button>
                            <button className="flex-1 md:flex-none h-10 px-6 rounded-full bg-primary hover:bg-[#eae605] text-black font-semibold transition-colors shadow-sm flex items-center justify-center gap-2"><span className="material-symbols-outlined text-[18px]">done_all</span>Batch Approve</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AttendanceInterventionScreen;
