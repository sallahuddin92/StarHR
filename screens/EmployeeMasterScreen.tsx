
import React, { useEffect, useState, useRef } from 'react';
import { api, ApiError } from '../src/lib/api';
import type { Screen } from '../App';

type EmployeeRow = {
    id: string;
    employee_id: string;
    full_name: string;
    email: string;
    department: string | null;
    designation: string | null;
};

interface EmployeeMasterScreenProps {
    onNavigate: (screen: Screen) => void;
}

type TabMode = 'records' | 'import';

const EmployeeMasterScreen: React.FC<EmployeeMasterScreenProps> = ({ onNavigate }) => {
    const [employees, setEmployees] = useState<EmployeeRow[]>([]);
    const [activeTab, setActiveTab] = useState<TabMode>('import');
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchEmployees = async () => {
            setLoading(true);
            setError(null);
            try {
                const response = await api.employees.getAll();
                setEmployees(response.data || []);
            } catch (err) {
                const message = err instanceof ApiError ? err.message : 'Failed to fetch employees';
                setError(message);
            } finally {
                setLoading(false);
            }
        };

        fetchEmployees();
    }, []);

    return (
        <div className="bg-background-light dark:bg-background-dark font-display text-slate-900 dark:text-white min-h-screen flex flex-col overflow-x-hidden">
            <main className="flex-grow w-full max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col gap-6">
                <div className="flex flex-wrap gap-2 px-1">
                    <button className="text-[#8c8b5f] dark:text-[#a3a272] text-sm font-medium leading-normal hover:underline" onClick={() => onNavigate('Dashboard')}>Home</button>
                    <span className="text-[#8c8b5f] dark:text-[#a3a272] text-sm font-medium leading-normal">/</span>
                    <button className="text-[#8c8b5f] dark:text-[#a3a272] text-sm font-medium leading-normal hover:underline" onClick={() => onNavigate('Dashboard')}>HR</button>
                    <span className="text-[#8c8b5f] dark:text-[#a3a272] text-sm font-medium leading-normal">/</span>
                    <span className="text-slate-900 dark:text-white text-sm font-medium leading-normal">Employee Master</span>
                </div>
                <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
                    <div className="flex flex-col gap-2">
                        <h1 className="text-4xl font-black leading-tight tracking-[-0.033em] text-slate-900 dark:text-white">Employee Master</h1>
                        <p className="text-[#8c8b5f] dark:text-[#a3a272] text-base font-normal max-w-2xl">Manage employee data, import bulk records, and validate hierarchy assignments.</p>
                    </div>
                    <div className="bg-[#e6e6db] dark:bg-[#3a392a] p-1 rounded-full flex items-center">
                        <button 
                            className={`px-6 py-2 rounded-full text-sm font-medium transition-colors ${activeTab === 'records' ? 'bg-primary text-black shadow-sm font-bold' : 'text-[#6b6a48] dark:text-[#a3a272] hover:text-slate-900 dark:hover:text-white'}`}
                            onClick={() => setActiveTab('records')}
                        >
                            View Records
                        </button>
                        <button 
                            className={`px-6 py-2 rounded-full text-sm font-medium transition-colors ${activeTab === 'import' ? 'bg-primary text-black shadow-sm font-bold' : 'text-[#6b6a48] dark:text-[#a3a272] hover:text-slate-900 dark:hover:text-white'}`}
                            onClick={() => setActiveTab('import')}
                        >
                            Bulk Import
                        </button>
                    </div>
                </div>
                {activeTab === 'import' && (
                <div className="bg-white dark:bg-[#1a190b] rounded-xl p-8 border border-[#e6e6db] dark:border-[#3a392a] shadow-sm">
                    <input 
                        type="file" 
                        ref={fileInputRef} 
                        className="hidden" 
                        accept=".csv,.xlsx,.xls" 
                        onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) setSelectedFile(file);
                        }}
                    />
                    <div 
                        className={`border-2 border-dashed rounded-xl p-10 flex flex-col items-center justify-center gap-6 transition-colors group cursor-pointer bg-background-light/50 dark:bg-background-dark/50 ${isDragging ? 'border-primary bg-primary/10' : 'border-[#e6e6db] dark:border-[#3a392a] hover:border-primary/50'}`}
                        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                        onDragLeave={(e) => { e.preventDefault(); setIsDragging(false); }}
                        onDrop={(e) => {
                            e.preventDefault();
                            setIsDragging(false);
                            const file = e.dataTransfer.files?.[0];
                            if (file && (file.name.endsWith('.csv') || file.name.endsWith('.xlsx') || file.name.endsWith('.xls'))) {
                                setSelectedFile(file);
                            }
                        }}
                        onClick={() => fileInputRef.current?.click()}
                    >
                        <div className="size-16 rounded-full bg-primary/20 flex items-center justify-center text-primary-dark mb-2 group-hover:scale-110 transition-transform">
                            <span className="material-symbols-outlined text-3xl text-black/70 dark:text-white">{selectedFile ? 'description' : 'cloud_upload'}</span>
                        </div>
                        <div className="text-center space-y-2">
                            {selectedFile ? (
                                <>
                                    <p className="text-lg font-bold text-slate-900 dark:text-white">{selectedFile.name}</p>
                                    <p className="text-sm text-[#8c8b5f] dark:text-[#a3a272]">{(selectedFile.size / 1024).toFixed(1)} KB - Click to change file</p>
                                </>
                            ) : (
                                <>
                                    <p className="text-lg font-bold text-slate-900 dark:text-white">Upload Employee Data</p>
                                    <p className="text-sm text-[#8c8b5f] dark:text-[#a3a272]">Drag and drop CSV or Excel file here to upload employee roster.</p>
                                </>
                            )}
                        </div>
                        <button 
                            className="bg-[#f5f5f0] dark:bg-[#2c2b1a] hover:bg-primary hover:text-black text-slate-900 dark:text-white px-6 py-2.5 rounded-full text-sm font-bold transition-all shadow-sm"
                            onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
                        >
                            Browse Files
                        </button>
                    </div>
                </div>
                )}
                {activeTab === 'records' && (
                 <div className="bg-white dark:bg-[#1a190b] rounded-xl border border-[#e6e6db] dark:border-[#3a392a] shadow-sm overflow-hidden flex flex-col">
                    <div className="px-6 py-4 border-b border-[#e6e6db] dark:border-[#3a392a] flex items-center justify-between bg-white dark:bg-[#1a190b]">
                        <div className="flex items-center gap-2">
                            <h3 className="text-lg font-bold">Employees</h3>
                            <span className="px-2 py-0.5 rounded-full bg-[#f5f5f0] dark:bg-[#2c2b1a] text-xs font-medium text-[#8c8b5f]">{employees.length} records</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                            {loading && <span className="text-[#8c8b5f]">Loading…</span>}
                            {error && <span className="text-red-500">{error}</span>}
                        </div>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-[#f8f8f5] dark:bg-[#23220f] border-b border-[#e6e6db] dark:border-[#3a392a]">
                                    <th className="py-3 px-6 text-xs font-semibold uppercase tracking-wider text-[#8c8b5f]">Emp ID</th>
                                    <th className="py-3 px-6 text-xs font-semibold uppercase tracking-wider text-[#8c8b5f]">Employee Name</th>
                                    <th className="py-3 px-6 text-xs font-semibold uppercase tracking-wider text-[#8c8b5f]">Department</th>
                                    <th className="py-3 px-6 text-xs font-semibold uppercase tracking-wider text-[#8c8b5f]">Designation</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[#e6e6db] dark:divide-[#3a392a]">
                                {employees.map((emp) => (
                                    <tr key={emp.id} className="hover:bg-[#f5f5f0] dark:hover:bg-[#2c2b1a] transition-colors">
                                        <td className="py-4 px-6 text-sm font-medium">{emp.employee_id}</td>
                                        <td className="py-4 px-6">
                                            <div className="flex items-center gap-3">
                                                <div className="size-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 text-xs font-bold">
                                                    {emp.full_name.slice(0,2).toUpperCase()}
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="text-sm font-semibold text-slate-900 dark:text-white">{emp.full_name}</span>
                                                    <span className="text-xs text-[#8c8b5f]">{emp.email}</span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="py-4 px-6 text-sm text-slate-900 dark:text-white">{emp.department || '—'}</td>
                                        <td className="py-4 px-6 text-sm text-slate-900 dark:text-white">{emp.designation || '—'}</td>
                                    </tr>
                                ))}
                                {employees.length === 0 && !loading && !error && (
                                    <tr>
                                        <td colSpan={4} className="py-6 px-6 text-sm text-[#8c8b5f] text-center">No employees found.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                     <div className="p-4 border-t border-[#e6e6db] dark:border-[#3a392a] bg-[#f8f8f5] dark:bg-[#23220f] flex flex-col sm:flex-row items-center justify-between gap-4">
                        <div className="flex items-center gap-3 text-sm text-[#8c8b5f] order-2 sm:order-1"><span className="material-symbols-outlined text-lg">info</span><p>Only valid records will be processed. Invalid records must be corrected in the source file and re-uploaded.</p></div>
                        <div className="flex items-center gap-3 order-1 sm:order-2 w-full sm:w-auto">
                            <button 
                                className="px-6 py-2.5 rounded-full text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors w-full sm:w-auto"
                                onClick={() => onNavigate('Dashboard')}
                            >
                                Cancel
                            </button>
                            <button
                              className="px-6 py-2.5 rounded-full text-sm font-bold bg-primary text-black hover:bg-[#d6d305] shadow-md transition-colors flex items-center justify-center gap-2 w-full sm:w-auto"
                              onClick={async () => {
                                const payloads = employees.map((emp) => ({
                                  employeeId: emp.employee_id,
                                  fullName: emp.full_name,
                                  email: emp.email,
                                  department: emp.department || undefined,
                                  designation: emp.designation || undefined,
                                }));

                                                                try {
                                                                    await Promise.all(payloads.map((body) => api.employees.create(body)));
                                                                    alert('Employees saved');
                                                                } catch (err) {
                                                                    const message = err instanceof ApiError ? err.message : 'Failed to save employees';
                                                                    alert(message);
                                                                }
                              }}
                            >
                              <span className="material-symbols-outlined text-lg">check</span>
                              Save Valid Records
                            </button>
                        </div>
                    </div>
                </div>
                )}
            </main>
        </div>
    );
};

export default EmployeeMasterScreen;
