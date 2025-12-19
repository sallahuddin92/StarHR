
import React, { useEffect, useState } from 'react';
import { api, ApiError } from '../src/lib/api';

type EmployeeRow = {
    id: string;
    employee_id: string;
    full_name: string;
    email: string;
    department: string | null;
    designation: string | null;
};

const Header: React.FC = () => (
     <header className="flex items-center justify-between whitespace-nowrap border-b border-solid border-b-[#e6e6db] dark:border-b-[#3a392a] px-10 py-3 bg-white dark:bg-[#1a190b]">
        <div className="flex items-center gap-8">
            <div className="flex items-center gap-4 text-[#181811] dark:text-white">
                <div className="size-8 text-primary">
                   <svg className="w-full h-full" fill="none" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg"><path clipRule="evenodd" d="M24 18.4228L42 11.475V34.3663C42 34.7796 41.7457 35.1504 41.3601 35.2992L24 42V18.4228Z" fill="currentColor" fillRule="evenodd"></path><path clipRule="evenodd" d="M24 8.18819L33.4123 11.574L24 15.2071L14.5877 11.574L24 8.18819ZM9 15.8487L21 20.4805V37.6263L9 32.9945V15.8487ZM27 37.6263V20.4805L39 15.8487V32.9945L27 37.6263ZM25.354 2.29885C24.4788 1.98402 23.5212 1.98402 22.646 2.29885L4.98454 8.65208C3.7939 9.08038 3 10.2097 3 11.475V34.3663C3 36.0196 4.01719 37.5026 5.55962 38.098L22.9197 44.7987C23.6149 45.0671 24.3851 45.0671 25.0803 44.7987L42.4404 38.098C43.9828 37.5026 45 36.0196 45 34.3663V11.475C45 10.2097 44.2061 9.08038 43.0155 8.65208L25.354 2.29885Z" fill="currentColor" fillRule="evenodd"></path></svg>
                </div>
                <h2 className="text-lg font-bold leading-tight tracking-[-0.015em]">HR System</h2>
            </div>
            <div className="hidden lg:flex items-center gap-9">
                <a className="text-slate-900 dark:text-white text-sm font-medium leading-normal hover:text-primary transition-colors" href="#">Dashboard</a>
                <a className="text-slate-900 dark:text-white text-sm font-medium leading-normal hover:text-primary transition-colors" href="#">Employees</a>
                <a className="text-slate-900 dark:text-white text-sm font-medium leading-normal hover:text-primary transition-colors" href="#">Payroll</a>
                <a className="text-slate-900 dark:text-white text-sm font-medium leading-normal hover:text-primary transition-colors" href="#">Reports</a>
            </div>
        </div>
        <div className="flex flex-1 justify-end gap-8 items-center">
            <label className="flex-col min-w-40 !h-10 max-w-64 hidden md:flex">
                <div className="flex w-full flex-1 items-stretch rounded-xl h-full bg-[#f5f5f0] dark:bg-[#2c2b1a]">
                    <div className="text-[#8c8b5f] flex border-none items-center justify-center pl-4 rounded-l-xl border-r-0"><span className="material-symbols-outlined text-xl">search</span></div>
                    <input className="form-input flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-xl text-[#181811] dark:text-white focus:outline-0 focus:ring-0 border-none bg-transparent focus:border-none h-full placeholder:text-[#8c8b5f] px-4 rounded-l-none border-l-0 pl-2 text-base font-normal leading-normal" placeholder="Search" />
                </div>
            </label>
            <div className="bg-center bg-no-repeat aspect-square bg-cover rounded-full size-10 border-2 border-primary" style={{ backgroundImage: `url("https://picsum.photos/id/1025/100/100")`}}></div>
        </div>
    </header>
);

const EmployeeMasterScreen: React.FC = () => {
    const [employees, setEmployees] = useState<EmployeeRow[]>([]);
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
            <Header/>
            <main className="flex-grow w-full max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col gap-6">
                <div className="flex flex-wrap gap-2 px-1">
                    <a className="text-[#8c8b5f] dark:text-[#a3a272] text-sm font-medium leading-normal hover:underline" href="#">Home</a>
                    <span className="text-[#8c8b5f] dark:text-[#a3a272] text-sm font-medium leading-normal">/</span>
                    <a className="text-[#8c8b5f] dark:text-[#a3a272] text-sm font-medium leading-normal hover:underline" href="#">HR</a>
                    <span className="text-[#8c8b5f] dark:text-[#a3a272] text-sm font-medium leading-normal">/</span>
                    <span className="text-slate-900 dark:text-white text-sm font-medium leading-normal">Employee Master</span>
                </div>
                <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
                    <div className="flex flex-col gap-2">
                        <h1 className="text-4xl font-black leading-tight tracking-[-0.033em] text-slate-900 dark:text-white">Employee Master</h1>
                        <p className="text-[#8c8b5f] dark:text-[#a3a272] text-base font-normal max-w-2xl">Manage employee data, import bulk records, and validate hierarchy assignments.</p>
                    </div>
                    <div className="bg-[#e6e6db] dark:bg-[#3a392a] p-1 rounded-full flex items-center">
                        <a className="px-6 py-2 rounded-full text-sm font-medium text-[#6b6a48] dark:text-[#a3a272] hover:text-slate-900 dark:hover:text-white transition-colors" href="#">View Records</a>
                        <button className="px-6 py-2 rounded-full text-sm font-bold bg-primary text-black shadow-sm">Bulk Import</button>
                    </div>
                </div>
                <div className="bg-white dark:bg-[#1a190b] rounded-xl p-8 border border-[#e6e6db] dark:border-[#3a392a] shadow-sm">
                    <div className="border-2 border-dashed border-[#e6e6db] dark:border-[#3a392a] rounded-xl p-10 flex flex-col items-center justify-center gap-6 hover:border-primary/50 transition-colors group cursor-pointer bg-background-light/50 dark:bg-background-dark/50">
                        <div className="size-16 rounded-full bg-primary/20 flex items-center justify-center text-primary-dark mb-2 group-hover:scale-110 transition-transform">
                            <span className="material-symbols-outlined text-3xl text-black/70 dark:text-white">cloud_upload</span>
                        </div>
                        <div className="text-center space-y-2">
                            <p className="text-lg font-bold text-slate-900 dark:text-white">Upload Employee Data</p>
                            <p className="text-sm text-[#8c8b5f] dark:text-[#a3a272]">Drag and drop CSV or Excel file here to upload employee roster.</p>
                        </div>
                        <button className="bg-[#f5f5f0] dark:bg-[#2c2b1a] hover:bg-primary hover:text-black text-slate-900 dark:text-white px-6 py-2.5 rounded-full text-sm font-bold transition-all shadow-sm">Browse Files</button>
                    </div>
                </div>
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
                            <button className="px-6 py-2.5 rounded-full text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors w-full sm:w-auto">Cancel</button>
                            <button
                              className="px-6 py-2.5 rounded-full text-sm font-bold bg-primary text-black hover:bg-[#d6d305] shadow-md transition-colors flex items-center justify-center gap-2 w-full sm:w-auto"
                              onClick={async () => {
                                const token = localStorage.getItem('authToken');
                                const payloads = employees.map((emp) => ({
                                  employeeId: emp.employee_id,
                                  fullName: emp.full_name,
                                  email: emp.email,
                                  department: emp.department || undefined,
                                  designation: emp.designation || undefined,
                                }));

                                for (const body of payloads) {
                                  await fetch(`${API_BASE}/api/employees`, {
                                    method: 'POST',
                                    headers: {
                                      'Content-Type': 'application/json',
                                      ...(token ? { Authorization: `Bearer ${token}` } : {}),
                                    },
                                    body: JSON.stringify(body),
                                  });
                                }
                                alert('Employees saved');
                              }}
                            >
                              <span className="material-symbols-outlined text-lg">check</span>
                              Save Valid Records
                            </button>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default EmployeeMasterScreen;
