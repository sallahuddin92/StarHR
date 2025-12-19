
import React, { useState, useEffect } from 'react';
import { api, EmployeeDocument, ApiError } from '../src/lib/api';

const Sidebar: React.FC = () => (
    <aside className="w-64 bg-surface-light dark:bg-surface-dark border-r border-[#e5e5e0] dark:border-[#3e3d25] flex-col justify-between hidden lg:flex overflow-y-auto">
        <div className="flex flex-col gap-2 p-4">
            <div className="mb-6 px-3 py-2">
                <p className="text-[#8c8b5f] text-xs font-bold uppercase tracking-wider mb-2">Main Menu</p>
                <div className="flex flex-col gap-1">
                    <a className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-[#f5f5f0] dark:hover:bg-[#3e3d25]/50 group transition-colors" href="#"><span className="material-symbols-outlined text-[#8c8b5f] group-hover:text-[#181811] dark:text-[#8c8b5f] dark:group-hover:text-primary">dashboard</span><span className="text-sm font-medium">Dashboard</span></a>
                    <a className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-[#f5f5f0] dark:hover:bg-[#3e3d25]/50 group transition-colors" href="#"><span className="material-symbols-outlined text-[#8c8b5f] group-hover:text-[#181811] dark:text-[#8c8b5f] dark:group-hover:text-primary">group</span><span className="text-sm font-medium">Employees</span></a>
                    <a className="flex items-center gap-3 px-3 py-2 rounded-xl bg-primary/20 dark:bg-primary/10 text-[#181811] dark:text-primary group transition-colors" href="#"><span className="material-symbols-outlined text-[#181811] dark:text-primary">description</span><span className="text-sm font-medium">Document Center</span></a>
                    <a className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-[#f5f5f0] dark:hover:bg-[#3e3d25]/50 group transition-colors" href="#"><span className="material-symbols-outlined text-[#8c8b5f] group-hover:text-[#181811] dark:text-[#8c8b5f] dark:group-hover:text-primary">payments</span><span className="text-sm font-medium">Payroll</span></a>
                </div>
            </div>
            <div className="px-3 py-2">
                <p className="text-[#8c8b5f] text-xs font-bold uppercase tracking-wider mb-2">Configuration</p>
                <div className="flex flex-col gap-1">
                    <a className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-[#f5f5f0] dark:hover:bg-[#3e3d25]/50 group transition-colors" href="#"><span className="material-symbols-outlined text-[#8c8b5f] group-hover:text-[#181811] dark:text-[#8c8b5f] dark:group-hover:text-primary">settings</span><span className="text-sm font-medium">Settings</span></a>
                    <a className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-[#f5f5f0] dark:hover:bg-[#3e3d25]/50 group transition-colors" href="#"><span className="material-symbols-outlined text-[#8c8b5f] group-hover:text-[#181811] dark:text-[#8c8b5f] dark:group-hover:text-primary">help</span><span className="text-sm font-medium">Support</span></a>
                </div>
            </div>
        </div>
        <div className="p-4 border-t border-[#e5e5e0] dark:border-[#3e3d25]">
            <div className="bg-gradient-to-br from-[#f5f5f0] to-white dark:from-[#2e2d15] dark:to-[#23220f] p-4 rounded-xl border border-[#e5e5e0] dark:border-[#3e3d25]">
                <div className="flex items-center gap-2 mb-2 text-[#8c8b5f]"><span className="material-symbols-outlined text-sm">info</span><span className="text-xs font-bold uppercase">System Status</span></div>
                <div className="flex items-center gap-2"><div className="size-2 rounded-full bg-green-500 animate-pulse"></div><span className="text-xs font-medium text-[#181811] dark:text-white">All systems operational</span></div>
            </div>
        </div>
    </aside>
);

const Header: React.FC = () => (
    <header className="flex items-center justify-between whitespace-nowrap border-b border-solid border-[#e5e5e0] dark:border-[#3e3d25] px-6 py-3 bg-surface-light dark:bg-surface-dark z-20">
        <div className="flex items-center gap-4">
            <div className="size-8 text-primary"><svg className="w-full h-full" fill="none" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg"><path d="M6 6H42L36 24L42 42H6L12 24L6 6Z" fill="currentColor"></path></svg></div>
            <h2 className="text-lg font-bold leading-tight tracking-[-0.015em]">HR Enterprise</h2>
        </div>
        <div className="flex flex-1 justify-end gap-6">
            <label className="hidden md:flex flex-col min-w-40 !h-10 max-w-64">
                <div className="flex w-full flex-1 items-stretch rounded-xl h-full border border-[#e5e5e0] dark:border-[#3e3d25] overflow-hidden">
                    <div className="text-[#8c8b5f] flex border-none bg-[#f5f5f0] dark:bg-[#23220f] items-center justify-center pl-4 pr-2"><span className="material-symbols-outlined text-[20px]">search</span></div>
                    <input className="form-input flex w-full min-w-0 flex-1 resize-none focus:outline-0 focus:ring-0 border-none bg-[#f5f5f0] dark:bg-[#23220f] focus:border-none h-full placeholder:text-[#8c8b5f] px-2 text-sm font-normal leading-normal" placeholder="Search modules..." />
                </div>
            </label>
            <div className="flex items-center gap-3">
                <button className="relative p-2 text-[#8c8b5f] hover:text-[#181811] dark:hover:text-primary transition-colors"><span className="material-symbols-outlined">notifications</span><span className="absolute top-2 right-2 size-2 bg-red-500 rounded-full border-2 border-white dark:border-[#2e2d15]"></span></button>
                <div className="bg-center bg-no-repeat bg-cover rounded-full size-10 border-2 border-white dark:border-[#3e3d25] shadow-sm" style={{backgroundImage: `url("https://picsum.photos/id/40/100/100")`}}></div>
            </div>
        </div>
    </header>
);

const StatusComponent: React.FC<{ status: string }> = ({ status }) => {
    switch (status) {
        case 'Ready':
            return <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"><span className="material-symbols-outlined text-[16px]">check_circle</span>Ready</span>;
        case 'Generating':
            return <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"><span className="material-symbols-outlined text-[16px] animate-spin">sync</span>Generating</span>;
        case 'Pending':
            return <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400"><span className="material-symbols-outlined text-[16px]">pending</span>Pending</span>;
        case 'Error':
            return <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400"><span className="material-symbols-outlined text-[16px]">error</span>Error</span>;
        default: return null;
    }
};


const DocumentCenterScreen: React.FC = () => {
    const [selectedProcess, setSelectedProcess] = useState('payslip');
    const [employeeDocs, setEmployeeDocs] = useState<EmployeeDocument[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
    const [broadcastLoading, setBroadcastLoading] = useState(false);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [pagination, setPagination] = useState({ total: 0, limit: 100, offset: 0 });

    const currentPeriod = new Date().toISOString().slice(0, 7); // YYYY-MM format

    useEffect(() => {
        fetchEmployeeDocuments();
    }, [selectedProcess]);

    const fetchEmployeeDocuments = async () => {
        try {
            setLoading(true);
            setError(null);
            const response = await api.documents.getEmployees({
                type: selectedProcess,
                period: currentPeriod,
            });
            if (response.success && response.data) {
                setEmployeeDocs(response.data);
                // Auto-select all "Ready" documents
                const readyIds = new Set(response.data.filter(d => d.status === 'Ready').map(d => d.id));
                setSelectedIds(readyIds);
                if (response.pagination) {
                    setPagination(response.pagination as any);
                }
            }
        } catch (err) {
            const message = err instanceof ApiError ? err.message : 'Failed to load documents';
            setError(message);
        } finally {
            setLoading(false);
        }
    };

    const handleBroadcast = async () => {
        setBroadcastLoading(true);
        try {
            const selectedEmployeeIds = employeeDocs
                .filter(d => selectedIds.has(d.id) && d.status === 'Ready')
                .map(d => d.employeeId);
            
            const response = await api.documents.broadcast({
                channel: 'whatsapp',
                employeeIds: selectedEmployeeIds,
            });
            
            if (response.success) {
                setToast({ 
                    message: `Documents queued for ${response.data?.recipientCount || selectedEmployeeIds.length} employees!`, 
                    type: 'success' 
                });
            }
        } catch (err) {
            const message = err instanceof ApiError ? err.message : 'Broadcast failed';
            setToast({ message, type: 'error' });
        } finally {
            setBroadcastLoading(false);
            setTimeout(() => setToast(null), 3000);
        }
    };

    const handleSelectAll = (checked: boolean) => {
        if (checked) {
            const readyIds = new Set(employeeDocs.filter(d => d.status === 'Ready').map(d => d.id));
            setSelectedIds(readyIds);
        } else {
            setSelectedIds(new Set());
        }
    };

    const handleSelectOne = (id: string, checked: boolean) => {
        const newSet = new Set(selectedIds);
        if (checked) {
            newSet.add(id);
        } else {
            newSet.delete(id);
        }
        setSelectedIds(newSet);
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-MY', { 
            style: 'currency', 
            currency: 'MYR',
            minimumFractionDigits: 2 
        }).format(amount);
    };

    const getDeptColorClass = (dept: string) => {
        const colors: Record<string, string> = {
            'Engineering': 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
            'Marketing': 'bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
            'Sales': 'bg-yellow-50 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300',
            'HR': 'bg-orange-50 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
            'Finance': 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300',
        };
        return colors[dept] || 'bg-gray-50 text-gray-700 dark:bg-gray-800 dark:text-gray-300';
    };

    const readyCount = employeeDocs.filter(d => d.status === 'Ready').length;
    const progressPercent = employeeDocs.length > 0 ? Math.round((readyCount / employeeDocs.length) * 100) : 0;

    return (
        <div className="bg-background-light dark:bg-background-dark text-[#181811] dark:text-white font-display min-h-screen flex flex-col">
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

            <div className="flex flex-1 overflow-hidden">
                <Sidebar />
                <div className="flex flex-col flex-1 overflow-hidden">
                    <Header />
                    <main className="flex-1 overflow-y-auto bg-background-light dark:bg-background-dark p-4 md:p-8">
                        <div className="max-w-[1200px] mx-auto flex flex-col gap-6">
                            <div className="flex flex-col gap-4">
                                <nav className="flex items-center gap-2 text-sm text-[#8c8b5f]"><a className="hover:text-[#181811] dark:hover:text-white transition-colors" href="#">Home</a><span className="material-symbols-outlined text-[16px]">chevron_right</span><span className="text-[#181811] dark:text-white font-medium">Document Center</span></nav>
                                <div className="flex flex-wrap justify-between items-end gap-4">
                                    <div>
                                        <h1 className="text-3xl md:text-4xl font-black text-[#181811] dark:text-white tracking-tight mb-2">Document Center</h1>
                                        <p className="text-[#8c8b5f] text-base md:text-lg max-w-2xl">Batch process and generate employee documents for payroll and tax compliance.</p>
                                    </div>
                                    <div className="flex gap-2"><button className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-[#2e2d15] border border-[#e5e5e0] dark:border-[#3e3d25] rounded-full text-sm font-medium text-[#181811] dark:text-white hover:bg-[#f5f5f0] dark:hover:bg-[#3e3d25] transition-colors"><span className="material-symbols-outlined text-[20px]">history</span>History Log</button></div>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 mt-4">
                               <div className="relative group cursor-pointer" onClick={() => setSelectedProcess('payslip')}>
                                    <div className={`absolute inset-0 rounded-xl blur-sm transition-opacity ${selectedProcess === 'payslip' ? 'bg-primary/20 dark:bg-primary/10 opacity-100' : 'opacity-0 group-hover:opacity-100 group-hover:bg-neutral-200/50 dark:group-hover:bg-neutral-800/50'}`}></div>
                                    <div className={`relative h-full flex flex-col p-6 rounded-xl bg-surface-light dark:bg-surface-dark transition-all ${selectedProcess === 'payslip' ? 'border-2 border-primary' : 'border border-[#e5e5e0] dark:border-[#3e3d25] hover:border-[#8c8b5f] dark:hover:border-neutral-500'}`}>
                                        <div className="flex justify-between items-start mb-4">
                                            <div className="p-3 bg-primary/20 rounded-full text-[#181811]"><span className="material-symbols-outlined text-[32px]">receipt_long</span></div>
                                            {selectedProcess === 'payslip' && <div className="px-3 py-1 bg-primary text-[#181811] text-xs font-bold uppercase rounded-full tracking-wide">Selected</div>}
                                        </div>
                                        <h3 className="text-xl font-bold text-[#181811] dark:text-white mb-2">Payslip Run</h3>
                                        <p className="text-[#8c8b5f] text-sm leading-relaxed mb-6">Generate monthly salary slips for all active employees. Includes standard deductions and bonus calculations.</p>
                                        <div className="mt-auto pt-4 border-t border-[#e5e5e0] dark:border-[#3e3d25] flex items-center text-sm font-medium text-[#181811] dark:text-white"><span>Current period: {currentPeriod}</span></div>
                                    </div>
                                </div>
                                <div className="relative group cursor-pointer" onClick={() => setSelectedProcess('ea-form')}>
                                     <div className={`absolute inset-0 rounded-xl blur-sm transition-opacity ${selectedProcess === 'ea-form' ? 'bg-primary/20 dark:bg-primary/10 opacity-100' : 'opacity-0 group-hover:opacity-100 group-hover:bg-neutral-200/50 dark:group-hover:bg-neutral-800/50'}`}></div>
                                    <div className={`relative h-full flex flex-col p-6 rounded-xl bg-surface-light dark:bg-surface-dark transition-all ${selectedProcess === 'ea-form' ? 'border-2 border-primary' : 'border border-[#e5e5e0] dark:border-[#3e3d25] hover:border-[#8c8b5f] dark:hover:border-neutral-500'}`}>
                                        <div className="flex justify-between items-start mb-4">
                                            <div className="p-3 bg-[#f5f5f0] dark:bg-[#3e3d25] rounded-full text-[#8c8b5f] group-hover:text-[#181811] dark:group-hover:text-white transition-colors"><span className="material-symbols-outlined text-[32px]">description</span></div>
                                            {selectedProcess === 'ea-form' && <div className="px-3 py-1 bg-primary text-[#181811] text-xs font-bold uppercase rounded-full tracking-wide">Selected</div>}
                                        </div>
                                        <h3 className="text-xl font-bold text-[#181811] dark:text-white mb-2">EA Form Generation</h3>
                                        <p className="text-[#8c8b5f] text-sm leading-relaxed mb-6">Process annual tax forms for the fiscal year. Requires finalized annual payroll data.</p>
                                        <div className="mt-auto pt-4 border-t border-[#e5e5e0] dark:border-[#3e3d25] flex items-center text-sm font-medium text-[#8c8b5f]"><span>Scheduled: Dec 31, 2025</span></div>
                                    </div>
                                </div>
                            </div>
                            
                            {selectedProcess === 'payslip' && (
                               <div className="flex flex-col gap-6 p-6 md:p-8 bg-surface-light dark:bg-surface-dark border border-[#e5e5e0] dark:border-[#3e3d25] rounded-xl shadow-sm mt-2 relative overflow-hidden">
                                    <div className="absolute top-0 left-0 right-0 h-1 bg-primary"></div>
                                    <div className="flex flex-col md:flex-row gap-6 md:items-center justify-between">
                                        <div className="flex flex-col gap-1">
                                            <h2 className="text-lg font-bold text-[#181811] dark:text-white flex items-center gap-2">
                                                <span className="material-symbols-outlined text-primary">play_circle</span>
                                                Active Run: {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                                            </h2>
                                            <p className="text-sm text-[#8c8b5f]">Batch ID: #PAY-{currentPeriod.replace('-', '')}-001 • {employeeDocs.length} Employees</p>
                                        </div>
                                        <div className="flex flex-1 max-w-md flex-col gap-2">
                                            <div className="flex justify-between text-xs font-bold uppercase tracking-wider text-[#181811] dark:text-white">
                                                <span>Generating Documents</span>
                                                <span className={progressPercent === 100 ? 'text-green-600 dark:text-green-400' : 'text-blue-600 dark:text-blue-400'}>
                                                    {progressPercent}% Complete
                                                </span>
                                            </div>
                                            <div className="h-4 w-full bg-[#f5f5f0] dark:bg-[#3e3d25] rounded-full overflow-hidden">
                                                <div className="h-full bg-primary rounded-full relative overflow-hidden transition-all duration-500" style={{ width: `${progressPercent}%` }}>
                                                    <div className="absolute inset-0 bg-[linear-gradient(45deg,rgba(255,255,255,.15)_25%,transparent_25%,transparent_50%,rgba(255,255,255,.15)_50%,rgba(255,255,255,.15)_75%,transparent_75%,transparent)] bg-[length:1rem_1rem]"></div>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex gap-3">
                                            <button 
                                                onClick={fetchEmployeeDocuments}
                                                className="px-5 py-2.5 rounded-full border border-[#e5e5e0] dark:border-[#3e3d25] text-[#181811] dark:text-white font-medium hover:bg-[#f5f5f0] dark:hover:bg-[#3e3d25] transition-colors flex items-center gap-2"
                                            >
                                                <span className="material-symbols-outlined text-[20px]">restart_alt</span>
                                                <span>Refresh</span>
                                            </button>
                                            <button 
                                                onClick={handleBroadcast}
                                                disabled={broadcastLoading || selectedIds.size === 0}
                                                className="px-6 py-2.5 rounded-full bg-[#25D366] hover:bg-[#20bd5a] text-white font-bold shadow-md hover:shadow-lg transition-all flex items-center gap-2 transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                                {broadcastLoading ? (
                                                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                                                ) : (
                                                    <span className="material-symbols-outlined text-[20px]">send</span>
                                                )}
                                                <span>Broadcast to WhatsApp</span>
                                            </button>
                                        </div>
                                    </div>
                                    <div className="border rounded-xl border-[#e5e5e0] dark:border-[#3e3d25] overflow-hidden bg-white dark:bg-[#23220f]">
                                        {loading ? (
                                            <div className="flex items-center justify-center py-12">
                                                <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
                                            </div>
                                        ) : error ? (
                                            <div className="p-8 text-center">
                                                <span className="material-symbols-outlined text-red-500 text-4xl mb-2">error</span>
                                                <p className="text-red-600 dark:text-red-400">{error}</p>
                                                <button onClick={fetchEmployeeDocuments} className="mt-4 px-4 py-2 bg-red-100 hover:bg-red-200 rounded-lg text-red-700 text-sm font-medium">
                                                    Try Again
                                                </button>
                                            </div>
                                        ) : (
                                            <>
                                                <div className="overflow-x-auto">
                                                    <table className="w-full text-left border-collapse">
                                                        <thead className="bg-[#f9f9f7] dark:bg-[#2e2d15] text-[#8c8b5f] text-xs font-bold uppercase tracking-wider">
                                                            <tr>
                                                                <th className="p-4 border-b border-[#e5e5e0] dark:border-[#3e3d25] w-12">
                                                                    <input 
                                                                        type="checkbox" 
                                                                        checked={selectedIds.size === employeeDocs.filter(d => d.status === 'Ready').length && selectedIds.size > 0}
                                                                        onChange={(e) => handleSelectAll(e.target.checked)}
                                                                        className="rounded border-gray-300 text-primary focus:ring-primary bg-transparent" 
                                                                    />
                                                                </th>
                                                                <th className="p-4 border-b border-[#e5e5e0] dark:border-[#3e3d25]">Employee</th>
                                                                <th className="p-4 border-b border-[#e5e5e0] dark:border-[#3e3d25]">Department</th>
                                                                <th className="p-4 border-b border-[#e5e5e0] dark:border-[#3e3d25]">Net Pay</th>
                                                                <th className="p-4 border-b border-[#e5e5e0] dark:border-[#3e3d25]">Status</th>
                                                                <th className="p-4 border-b border-[#e5e5e0] dark:border-[#3e3d25] text-right">Actions</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody className="text-sm">
                                                            {employeeDocs.map((emp, idx) => (
                                                                <tr key={emp.id} className="group hover:bg-[#f9f9f7] dark:hover:bg-[#2e2d15]/50 transition-colors border-b border-[#f5f5f0] dark:border-[#3e3d25]">
                                                                    <td className="p-4">
                                                                        <input 
                                                                            type="checkbox" 
                                                                            checked={selectedIds.has(emp.id)}
                                                                            onChange={(e) => handleSelectOne(emp.id, e.target.checked)}
                                                                            disabled={emp.status !== 'Ready'} 
                                                                            className="rounded border-gray-300 text-primary focus:ring-primary bg-transparent disabled:opacity-50" 
                                                                        />
                                                                    </td>
                                                                    <td className="p-4">
                                                                        <div className="flex items-center gap-3">
                                                                            {emp.avatarUrl ? (
                                                                                <div className="size-9 rounded-full bg-cover bg-center border border-[#e5e5e0] dark:border-[#3e3d25]" style={{backgroundImage: `url(${emp.avatarUrl})`}}></div>
                                                                            ) : (
                                                                                <div className="size-9 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-[#181811]">
                                                                                    {emp.employeeName.split(' ').map(n => n[0]).join('').slice(0, 2)}
                                                                                </div>
                                                                            )}
                                                                            <div>
                                                                                <p className="font-bold text-[#181811] dark:text-white">{emp.employeeName}</p>
                                                                                <p className="text-[#8c8b5f] text-xs">ID: {emp.employeeCode}</p>
                                                                            </div>
                                                                        </div>
                                                                    </td>
                                                                    <td className="p-4">
                                                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium ${getDeptColorClass(emp.department)}`}>
                                                                            {emp.department}
                                                                        </span>
                                                                    </td>
                                                                    <td className="p-4 font-mono text-[#181811] dark:text-white">{formatCurrency(emp.netPay)}</td>
                                                                    <td className="p-4"><StatusComponent status={emp.status} /></td>
                                                                    <td className="p-4 text-right">
                                                                        <button 
                                                                            className="text-[#8c8b5f] hover:text-[#181811] dark:hover:text-primary transition-colors p-1 disabled:opacity-50 disabled:cursor-not-allowed" 
                                                                            disabled={emp.status !== 'Ready'}
                                                                        >
                                                                            <span className="material-symbols-outlined text-[20px]">{emp.status === 'Ready' ? 'visibility' : 'visibility_off'}</span>
                                                                        </button>
                                                                    </td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                                <div className="flex items-center justify-between p-4 border-t border-[#e5e5e0] dark:border-[#3e3d25] bg-surface-light dark:bg-surface-dark">
                                                    <p className="text-sm text-[#8c8b5f]">
                                                        Showing <span className="font-medium text-[#181811] dark:text-white">1-{employeeDocs.length}</span> of <span className="font-medium text-[#181811] dark:text-white">{pagination.total || employeeDocs.length}</span> results
                                                    </p>
                                                    <div className="flex gap-2">
                                                        <button className="px-3 py-1 rounded-lg border border-[#e5e5e0] dark:border-[#3e3d25] text-sm text-[#8c8b5f] hover:bg-[#f5f5f0] dark:hover:bg-[#3e3d25] disabled:opacity-50" disabled>Previous</button>
                                                        <button className="px-3 py-1 rounded-lg border border-[#e5e5e0] dark:border-[#3e3d25] text-sm text-[#181811] dark:text-white hover:bg-[#f5f5f0] dark:hover:bg-[#3e3d25]">Next</button>
                                                    </div>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                </div>
                            )}

                        </div>
                    </main>
                </div>
            </div>
        </div>
    );
};

export default DocumentCenterScreen;
