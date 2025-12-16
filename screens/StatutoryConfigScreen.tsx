
import React, { useState } from 'react';

type Tab = 'general' | 'epf' | 'socso' | 'pcb';

const ToggleSwitch: React.FC<{ label: string; enabled: boolean; setEnabled: (enabled: boolean) => void; }> = ({ label, enabled, setEnabled }) => (
    <label className="flex items-center justify-between cursor-pointer">
        <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{label}</span>
        <div className="relative">
            <input type="checkbox" className="sr-only" checked={enabled} onChange={() => setEnabled(!enabled)} />
            <div className={`block w-14 h-8 rounded-full transition-colors ${enabled ? 'bg-primary' : 'bg-slate-200 dark:bg-slate-600'}`}></div>
            <div className={`dot absolute left-1 top-1 bg-white w-6 h-6 rounded-full transition-transform ${enabled ? 'translate-x-6' : ''}`}></div>
        </div>
    </label>
);

const MOCK_PCB_JSON = JSON.stringify({
  "effectiveYear": 2025,
  "schedule": [
    { "category": "M", "min": 0, "max": 5000, "rate": 0, "deduction": 0 },
    { "category": "M", "min": 5001, "max": 20000, "rate": 1, "deduction": 0 },
    { "category": "R", "min": 0, "max": 35000, "rate": 3, "deduction": 150 },
    { "category": "B", "min": 0, "max": 50000, "rate": 8, "deduction": 900 }
  ]
}, null, 2);

const StatutoryConfigScreen: React.FC = () => {
    const [activeTab, setActiveTab] = useState<Tab>('epf');
    const [foreignWorkerMandate, setForeignWorkerMandate] = useState(true);

    const renderContent = () => {
        switch (activeTab) {
            case 'epf':
                return (
                    <div className="space-y-8">
                        <div>
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">Foreign Worker Mandate (2025)</h3>
                            <p className="text-sm text-slate-500 dark:text-slate-400">Settings for non-citizen EPF contributions.</p>
                        </div>
                        <div className="bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-400 p-4 rounded-r-lg">
                            <div className="flex">
                                <div className="flex-shrink-0">
                                    <span className="material-symbols-outlined text-blue-500">info</span>
                                </div>
                                <div className="ml-3">
                                    <p className="text-sm text-blue-700 dark:text-blue-300">
                                        Effective <span className="font-bold">Oct 1, 2025</span>, non-citizens and expatriates (who have not elected to contribute) will be mandated to contribute to EPF.
                                    </p>
                                </div>
                            </div>
                        </div>
                        <div className="space-y-6">
                            <ToggleSwitch label="Enforce Foreign Worker Mandate (Oct 2025)" enabled={foreignWorkerMandate} setEnabled={setForeignWorkerMandate} />
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label htmlFor="employer-rate" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Employer Rate (Foreign)</label>
                                    <div className="relative">
                                        <input type="text" id="employer-rate" defaultValue="2.0" className="w-full pl-4 pr-8 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 focus:ring-primary focus:border-primary" />
                                        <span className="absolute inset-y-0 right-3 flex items-center text-slate-400 text-sm">%</span>
                                    </div>
                                </div>
                                <div>
                                    <label htmlFor="employee-rate" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Employee Rate (Foreign)</label>
                                    <div className="relative">
                                        <input type="text" id="employee-rate" defaultValue="2.0" className="w-full pl-4 pr-8 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 focus:ring-primary focus:border-primary" />
                                        <span className="absolute inset-y-0 right-3 flex items-center text-slate-400 text-sm">%</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                );
            case 'socso':
                 return (
                    <div className="space-y-8">
                        <div>
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">SOCSO / EIS Configuration</h3>
                            <p className="text-sm text-slate-500 dark:text-slate-400">Manage contribution rates and wage ceilings.</p>
                        </div>
                        <div>
                           <label htmlFor="insured-wage-ceiling" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Insured Wage Ceiling</label>
                           <div className="relative max-w-xs">
                                <span className="absolute inset-y-0 left-3 flex items-center text-slate-400 text-sm">RM</span>
                                <input type="text" id="insured-wage-ceiling" defaultValue="6,000.00" className="w-full pl-9 pr-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 focus:ring-primary focus:border-primary" />
                            </div>
                        </div>
                        <div>
                             <h4 className="text-md font-bold text-slate-900 dark:text-white mb-2">Contribution Class</h4>
                             <div className="overflow-x-auto border border-slate-200 dark:border-slate-700 rounded-lg">
                                <table className="w-full text-sm">
                                    <thead className="bg-slate-50 dark:bg-slate-700/50 text-left">
                                        <tr>
                                            <th className="p-3 font-semibold">Class</th>
                                            <th className="p-3 font-semibold">Wage Bracket</th>
                                            <th className="p-3 font-semibold">Employer Share (RM)</th>
                                            <th className="p-3 font-semibold">Employee Share (RM)</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                                        <tr className="hover:bg-slate-50 dark:hover:bg-slate-700/30">
                                            <td className="p-3">1</td>
                                            <td className="p-3">Up to 5,000.00</td>
                                            <td className="p-3"><input type="text" defaultValue="86.65" className="w-24 p-1 rounded bg-slate-100 dark:bg-slate-600 border border-slate-300 dark:border-slate-500 text-right"/></td>
                                            <td className="p-3"><input type="text" defaultValue="24.75" className="w-24 p-1 rounded bg-slate-100 dark:bg-slate-600 border border-slate-300 dark:border-slate-500 text-right"/></td>
                                        </tr>
                                         <tr className="hover:bg-slate-50 dark:hover:bg-slate-700/30">
                                            <td className="p-3">2</td>
                                            <td className="p-3">5,000.01 - 6,000.00</td>
                                            <td className="p-3"><input type="text" defaultValue="104.15" className="w-24 p-1 rounded bg-slate-100 dark:bg-slate-600 border border-slate-300 dark:border-slate-500 text-right"/></td>
                                            <td className="p-3"><input type="text" defaultValue="29.75" className="w-24 p-1 rounded bg-slate-100 dark:bg-slate-600 border border-slate-300 dark:border-slate-500 text-right"/></td>
                                        </tr>
                                    </tbody>
                                </table>
                             </div>
                        </div>
                    </div>
                );
            case 'pcb':
                return (
                    <div className="space-y-8">
                        <div>
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">PCB Tax Kernel (2025)</h3>
                            <p className="text-sm text-slate-500 dark:text-slate-400">Read-only view of the core tax calculation constants.</p>
                        </div>
                         <div className="bg-slate-100 dark:bg-slate-800 rounded-lg p-4">
                            <textarea
                                readOnly
                                className="w-full h-96 font-mono text-xs bg-[#0d1117] text-[#c9d1d9] p-4 rounded-md border-slate-700 focus:ring-primary focus:border-primary resize-none"
                                value={MOCK_PCB_JSON}
                            />
                        </div>
                    </div>
                );
            default:
                return (
                     <div>
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">General Settings</h3>
                        <p className="text-sm text-slate-500 dark:text-slate-400">General statutory settings for the organization.</p>
                    </div>
                );
        }
    };

    const TabButton: React.FC<{ tab: Tab; label: string; icon: string }> = ({ tab, label, icon }) => (
        <button
            onClick={() => setActiveTab(tab)}
            className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-full transition-colors ${activeTab === tab ? 'bg-primary text-black' : 'text-slate-500 dark:text-slate-300 hover:bg-slate-200/50 dark:hover:bg-slate-700/50'}`}
        >
            <span className="material-symbols-outlined text-lg">{icon}</span>
            <span>{label}</span>
        </button>
    );

    return (
        <div className="bg-background-light dark:bg-slate-900 min-h-screen">
            <header className="bg-white dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 px-8 py-4">
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Compliance Control Room</h1>
                <p className="text-sm text-slate-500 dark:text-slate-400">Manage statutory contribution rates and tax rules for Malaysia.</p>
            </header>
            <main className="p-4 md:p-8">
                <div className="max-w-4xl mx-auto">
                    <div className="mb-8 p-1.5 bg-slate-100 dark:bg-slate-800 rounded-full flex flex-col md:flex-row gap-2">
                        <TabButton tab="general" label="General" icon="tune" />
                        <TabButton tab="epf" label="EPF (KWSP)" icon="account_balance" />
                        <TabButton tab="socso" label="SOCSO / EIS" icon="health_and_safety" />
                        <TabButton tab="pcb" label="PCB (Tax) Tables" icon="request_quote" />
                    </div>

                    <div className="bg-white dark:bg-slate-800 rounded-xl p-6 md:p-8 border border-slate-200 dark:border-slate-700 shadow-sm">
                        {renderContent()}
                    </div>
                    
                    <footer className="mt-8 flex justify-end gap-3">
                        <button className="px-6 py-2 rounded-full border border-slate-300 dark:border-slate-600 text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
                            Cancel
                        </button>
                        <button className="px-6 py-2 rounded-full bg-slate-900 dark:bg-primary text-white dark:text-black text-sm font-semibold hover:bg-slate-700 dark:hover:bg-yellow-300 transition-colors">
                            Save Changes
                        </button>
                    </footer>
                </div>
            </main>
        </div>
    );
};

export default StatutoryConfigScreen;
