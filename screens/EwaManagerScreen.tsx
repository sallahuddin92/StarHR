
import React from 'react';

// --- MOCK DATA ---
interface EwaRequest {
  id: number;
  name: string;
  avatarUrl: string;
  department: string;
  deptColor: string;
  accruedSalary: number;
  requestedAmount: number;
}

const MOCK_EWA_REQUESTS: EwaRequest[] = [
    { id: 1, name: 'Ali bin Abu', avatarUrl: 'https://picsum.photos/id/447/100/100', department: 'Operations', deptColor: 'blue', accruedSalary: 1250.50, requestedAmount: 500.00 },
    { id: 2, name: 'Siti Nurhaliza', avatarUrl: 'https://picsum.photos/id/433/100/100', department: 'Sales', deptColor: 'pink', accruedSalary: 880.00, requestedAmount: 400.00 },
    { id: 3, name: 'John Doe', avatarUrl: 'https://picsum.photos/id/1005/100/100', department: 'Logistics', deptColor: 'green', accruedSalary: 950.00, requestedAmount: 600.00 }, // High-risk: Safe limit is 475, requested 600.
    { id: 4, name: 'Mei Lin', avatarUrl: 'https://picsum.photos/id/1012/100/100', department: 'Marketing', deptColor: 'purple', accruedSalary: 1800.00, requestedAmount: 250.00 },
    { id: 5, name: 'Rajesh Kumar', avatarUrl: 'https://picsum.photos/id/1013/100/100', department: 'IT Support', deptColor: 'indigo', accruedSalary: 2100.00, requestedAmount: 1000.00 },
];

const MOCK_WITHDRAWAL_HISTORY = [
    { name: 'Ali', amount: 50, time: '2 mins ago' },
    { name: 'David', amount: 120, time: '15 mins ago' },
    { name: 'Fatimah', amount: 80, time: '1 hour ago' },
    { name: 'Chen', amount: 200, time: '3 hours ago' },
];

// --- HELPER COMPONENTS ---
const SafeLimitProgress: React.FC<{ requested: number; limit: number }> = ({ requested, limit }) => {
    const percentage = Math.min((requested / limit) * 100, 100);
    const isOverLimit = requested > limit;

    return (
        <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2.5 relative">
            <div
                className={`h-2.5 rounded-full ${isOverLimit ? 'bg-red-500' : 'bg-primary'}`}
                style={{ width: `${isOverLimit ? 100 : percentage}%` }}
            ></div>
        </div>
    );
};

// --- MAIN COMPONENT ---
const EwaManagerScreen: React.FC = () => {
    const SAFE_LIMIT_PERCENTAGE = 0.5;
    const TOTAL_POOL = 50000;
    const TOTAL_DISBURSED = 15400;
    const UTILIZATION_PERCENTAGE = (TOTAL_DISBURSED / TOTAL_POOL) * 100;

    const formatCurrency = (amount: number) => {
        return `RM ${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    };

    return (
        <div className="bg-background-light dark:bg-slate-900 min-h-screen font-body text-slate-800 dark:text-slate-200 flex flex-col">
            <header className="flex-none px-6 py-4 md:px-10 border-b border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm sticky top-0 z-20">
                <div className="flex items-end justify-between gap-4">
                    <div>
                        <h1 className="text-slate-900 dark:text-white text-2xl md:text-3xl font-bold tracking-tight">EWA Liquidity Engine</h1>
                        <p className="text-slate-500 dark:text-slate-400 text-sm md:text-base">Monitor and approve Earned Wage Access requests.</p>
                    </div>
                    <div className="text-sm text-slate-500 flex items-center gap-2">
                        <div className="size-2 rounded-full bg-green-500 animate-pulse"></div>
                        <span>Live Feed</span>
                    </div>
                </div>
            </header>

            <div className="flex flex-1 overflow-hidden">
                <main className="flex-1 p-4 md:p-8 overflow-y-auto">
                    <div className="max-w-7xl mx-auto">
                        {/* Liquidity Overview Cards */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6 mb-8">
                            <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm">
                                <p className="text-slate-500 dark:text-slate-400 text-sm font-medium uppercase tracking-wider">Total Disbursed</p>
                                <p className="text-3xl font-bold text-slate-900 dark:text-white mt-2">{formatCurrency(TOTAL_DISBURSED)}</p>
                            </div>
                            <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm">
                                <p className="text-slate-500 dark:text-slate-400 text-sm font-medium uppercase tracking-wider">Available Pool</p>
                                <p className="text-3xl font-bold text-slate-900 dark:text-white mt-2">{formatCurrency(TOTAL_POOL - TOTAL_DISBURSED)}</p>
                                <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-1.5 mt-3">
                                    <div className="bg-primary h-1.5 rounded-full" style={{ width: `${UTILIZATION_PERCENTAGE}%` }}></div>
                                </div>
                            </div>
                            <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm">
                                <p className="text-slate-500 dark:text-slate-400 text-sm font-medium uppercase tracking-wider">Pending Requests</p>
                                <div className="flex items-baseline gap-2 mt-2">
                                    <p className="text-3xl font-bold text-slate-900 dark:text-white">{MOCK_EWA_REQUESTS.length}</p>
                                    <span className="text-sm text-slate-400">requests</span>
                                </div>
                                <div className="flex items-center gap-2 mt-2 text-xs text-orange-600 font-medium">
                                    <span className="material-symbols-outlined text-sm">warning</span>
                                    Action required
                                </div>
                            </div>
                            <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm">
                                <p className="text-slate-500 dark:text-slate-400 text-sm font-medium uppercase tracking-wider">Recovery Projection</p>
                                <p className="text-lg font-semibold text-slate-900 dark:text-white mt-2">To be deducted in Nov Payroll</p>
                            </div>
                        </div>

                        {/* Request Approval Table */}
                        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
                            <h3 className="text-lg font-bold p-6 text-slate-900 dark:text-white">Request Approval Queue</h3>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm text-left">
                                    <thead className="text-xs text-slate-500 uppercase bg-slate-50 dark:bg-slate-700/50 border-y border-slate-200 dark:border-slate-700">
                                        <tr>
                                            <th className="px-6 py-3 font-medium">Employee</th>
                                            <th className="px-6 py-3 font-medium">Department</th>
                                            <th className="px-6 py-3 font-medium">Accrued Salary</th>
                                            <th className="px-6 py-3 font-medium w-48">Safe Limit (50%)</th>
                                            <th className="px-6 py-3 font-medium">Requested</th>
                                            <th className="px-6 py-3 font-medium text-center">Status</th>
                                            <th className="px-6 py-3 font-medium text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                                        {MOCK_EWA_REQUESTS.map(req => {
                                            const safeLimit = req.accruedSalary * SAFE_LIMIT_PERCENTAGE;
                                            const isHighRisk = req.requestedAmount > safeLimit;
                                            return (
                                                <tr key={req.id} className={`hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors ${isHighRisk ? 'bg-red-50/30 dark:bg-red-900/10' : ''}`}>
                                                    <td className="px-6 py-4 font-medium text-slate-900 dark:text-white">
                                                        <div className="flex items-center gap-3">
                                                            <img src={req.avatarUrl} className="size-10 rounded-full object-cover" alt={req.name} />
                                                            <span>{req.name}</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-${req.deptColor}-100 text-${req.deptColor}-800 dark:bg-${req.deptColor}-900/30 dark:text-${req.deptColor}-300`}>{req.department}</span>
                                                    </td>
                                                    <td className="px-6 py-4 text-slate-500">{formatCurrency(req.accruedSalary)}</td>
                                                    <td className="px-6 py-4">
                                                        <div className="flex flex-col gap-1.5">
                                                            <span className="text-xs text-slate-500">{formatCurrency(safeLimit)}</span>
                                                            <SafeLimitProgress requested={req.requestedAmount} limit={safeLimit} />
                                                        </div>
                                                    </td>
                                                    <td className={`px-6 py-4 font-bold ${isHighRisk ? 'text-red-500' : 'text-slate-800 dark:text-white'}`}>
                                                        {formatCurrency(req.requestedAmount)}
                                                    </td>
                                                    <td className="px-6 py-4 text-center">
                                                        {isHighRisk ? (
                                                            <span className="inline-flex items-center rounded-full bg-red-100 dark:bg-red-900/20 px-2.5 py-0.5 text-xs font-medium text-red-700 dark:text-red-400 ring-1 ring-inset ring-red-600/20">High Risk</span>
                                                        ) : (
                                                            <span className="inline-flex items-center rounded-full bg-green-50 dark:bg-green-900/20 px-2.5 py-0.5 text-xs font-medium text-green-700 dark:text-green-400 ring-1 ring-inset ring-green-600/20">Safe</span>
                                                        )}
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <div className="flex items-center justify-end gap-2">
                                                            <button className="p-2 rounded-full text-slate-400 hover:bg-red-100 dark:hover:bg-red-900/30 hover:text-red-500 transition-colors" title="Reject">
                                                                <span className="material-symbols-outlined text-xl">cancel</span>
                                                            </button>
                                                            <button className="p-2 rounded-full text-slate-400 hover:bg-green-100 dark:hover:bg-green-900/30 hover:text-green-600 transition-colors" title="Approve">
                                                                <span className="material-symbols-outlined text-xl">check_circle</span>
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </main>
                <aside className="w-72 bg-white dark:bg-slate-800/50 border-l border-slate-200 dark:border-slate-800 p-6 flex-col hidden xl:flex">
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Withdrawal History</h3>
                    <div className="flex flex-col gap-4">
                        {MOCK_WITHDRAWAL_HISTORY.map((item, index) => (
                            <div key={index} className="flex items-center justify-between text-sm">
                                <div className="flex flex-col">
                                    <p className="font-semibold text-slate-800 dark:text-slate-200">{item.name}</p>
                                    <p className="text-xs text-slate-500">{item.time}</p>
                                </div>
                                <p className="font-mono text-slate-600 dark:text-slate-300">{formatCurrency(item.amount)}</p>
                            </div>
                        ))}
                    </div>
                </aside>
            </div>
        </div>
    );
};

export default EwaManagerScreen;
