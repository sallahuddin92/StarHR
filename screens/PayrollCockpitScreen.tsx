
import React, { useState } from 'react';
import { api, ApiError } from '../src/lib/api';
import { Screen } from '../App';

interface PayrollCockpitScreenProps {
    onNavigate: (screen: Screen) => void;
}

const Stepper: React.FC = () => (
    <nav className="w-full mb-12">
        <div className="flex flex-col md:flex-row items-center justify-between relative w-full max-w-3xl mx-auto">
            <div className="hidden md:block absolute top-1/2 left-0 w-full h-[2px] bg-slate-200 dark:bg-slate-700 -z-10 -translate-y-1/2"></div>
            <div className="flex flex-col items-center gap-3 bg-background-light dark:bg-background-dark px-4 z-10">
                <div className="flex items-center justify-center w-12 h-12 rounded-full bg-primary text-black font-bold text-lg shadow-[0_0_15px_rgba(249,245,6,0.4)] border-4 border-background-light dark:border-background-dark">
                    1
                </div>
                <span className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">Cycle Config</span>
            </div>
            <div className="flex flex-col items-center gap-3 bg-background-light dark:bg-background-dark px-4 z-10 opacity-60">
                <div className="flex items-center justify-center w-10 h-10 rounded-full bg-white dark:bg-slate-800 border-2 border-slate-300 dark:border-slate-600 text-slate-500 dark:text-slate-400 font-semibold">
                    2
                </div>
                <span className="text-sm font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Intervention</span>
            </div>
            <div className="flex flex-col items-center gap-3 bg-background-light dark:bg-background-dark px-4 z-10 opacity-60">
                <div className="flex items-center justify-center w-10 h-10 rounded-full bg-white dark:bg-slate-800 border-2 border-slate-300 dark:border-slate-600 text-slate-500 dark:text-slate-400 font-semibold">
                    3
                </div>
                <span className="text-sm font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Finalize</span>
            </div>
        </div>
    </nav>
);

const PayrollCockpitScreen: React.FC<PayrollCockpitScreenProps> = ({ onNavigate }) => {
    // Date state - using ISO format for API
    const [basicStartDate] = useState('2023-09-01');
    const [basicEndDate] = useState('2023-09-30');
    const [otStartDate, setOtStartDate] = useState('2023-08-26');
    const [otEndDate, setOtEndDate] = useState('2023-09-25');
    
    // UI state
    const [isLoading, setIsLoading] = useState(false);
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

    // Format date for display (e.g., "01 September 2023")
    const formatDisplayDate = (isoDate: string) => {
        const date = new Date(isoDate + 'T00:00:00');
        return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });
    };

    // Parse display date to ISO (e.g., "26 August 2023" -> "2023-08-26")
    const parseDisplayDate = (displayDate: string): string => {
        const date = new Date(displayDate);
        if (isNaN(date.getTime())) return '';
        return date.toISOString().split('T')[0];
    };

    const handleGenerateDraft = async () => {
        setIsLoading(true);
        setToast(null);

        try {
            const response = await api.payroll.runDraft({
                basicStartDate,
                basicEndDate,
                otStartDate,
                otEndDate,
            });

            const totalNetPay = response.data?.summary.totalNet ?? 0;
            const formattedNet = new Intl.NumberFormat('en-MY', {
                style: 'currency',
                currency: 'MYR',
            }).format(totalNetPay);

            setToast({
                message: `Draft payroll generated! Total Net Pay: ${formattedNet}`,
                type: 'success',
            });

            // Auto-hide toast after 5 seconds
            setTimeout(() => setToast(null), 5000);
        } catch (error) {
            // ApiError handles 401 redirect automatically
            const message = error instanceof ApiError ? error.message : 'An error occurred';
            setToast({ message, type: 'error' });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="bg-background-light dark:bg-background-dark font-display text-slate-900 dark:text-slate-100 antialiased min-h-screen flex flex-col overflow-x-hidden">
            <div className="relative flex flex-col grow w-full max-w-[1280px] mx-auto px-4 md:px-8 lg:px-12 py-8">
                {/* Breadcrumb */}
                <nav className="flex items-center gap-2 text-sm mb-6">
                    <button onClick={() => onNavigate('Dashboard')} className="text-slate-500 dark:text-slate-400 hover:text-primary transition-colors font-medium">Home</button>
                    <span className="material-symbols-outlined text-slate-400 text-[16px]">chevron_right</span>
                    <span className="text-slate-900 dark:text-white font-medium">Payroll Cockpit</span>
                </nav>
                
                <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-12">
                    <div className="flex flex-col gap-2">
                        <h1 className="text-4xl md:text-5xl font-black tracking-tight text-slate-900 dark:text-white">Payroll Cockpit</h1>
                        <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 font-medium">
                            <span className="material-symbols-outlined text-lg">calendar_month</span>
                            <p className="text-lg">September 2023 - Cycle A</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3 bg-white dark:bg-slate-800 p-2 rounded-full shadow-sm border border-slate-200 dark:border-slate-700">
                        <div className="h-2 w-2 rounded-full bg-emerald-500 ml-2"></div>
                        <span className="text-sm font-semibold pr-2 text-slate-700 dark:text-slate-300">System Online</span>
                    </div>
                </header>
                
                <Stepper />

                <main className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
                    <div className="group relative flex flex-col bg-white dark:bg-slate-800 rounded-xl p-8 shadow-sm border border-slate-200 dark:border-slate-700 h-full">
                        <div className="flex justify-between items-start mb-8">
                            <div className="flex items-center justify-center w-14 h-14 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">
                                <span className="material-symbols-outlined text-3xl">calendar_today</span>
                            </div>
                            <span className="px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs font-bold uppercase tracking-wider">Read-Only</span>
                        </div>
                        <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Basic Pay</h2>
                        <p className="text-slate-500 dark:text-slate-400 mb-8">Fixed cycle dates based on corporate policy.</p>
                        <div className="mt-auto space-y-6">
                            <div className="space-y-2">
                                <label className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Start Date</label>
                                <div className="flex items-center gap-3 px-5 py-3 rounded-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 opacity-70">
                                    <span className="material-symbols-outlined text-slate-400">event</span>
                                    <span className="font-medium text-slate-700 dark:text-slate-200">{formatDisplayDate(basicStartDate)}</span>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">End Date</label>
                                <div className="flex items-center gap-3 px-5 py-3 rounded-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 opacity-70">
                                    <span className="material-symbols-outlined text-slate-400">event</span>
                                    <span className="font-medium text-slate-700 dark:text-slate-200">{formatDisplayDate(basicEndDate)}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="group relative flex flex-col bg-white dark:bg-slate-800 rounded-xl p-8 shadow-lg ring-1 ring-slate-200 dark:ring-slate-700 hover:ring-primary/50 transition-all h-full">
                        <div className="absolute top-0 right-0 p-8">
                            <span className="px-3 py-1 rounded-full bg-primary/20 text-yellow-700 dark:text-yellow-200 text-xs font-bold uppercase tracking-wider border border-primary/20">Configurable</span>
                        </div>
                        <div className="flex justify-between items-start mb-8">
                            <div className="flex items-center justify-center w-14 h-14 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400">
                                <span className="material-symbols-outlined text-3xl">schedule</span>
                            </div>
                        </div>
                        <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Overtime</h2>
                        <p className="text-slate-500 dark:text-slate-400 mb-8">Set the cut-off period for overtime calculation.</p>
                        <div className="mt-auto space-y-6">
                            <div className="space-y-2">
                                <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wide">Cut-off Start</label>
                                <div className="relative group/input">
                                    <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none">
                                        <span className="material-symbols-outlined text-primary group-focus-within/input:text-primary transition-colors">date_range</span>
                                    </div>
                                    <input 
                                        className="w-full pl-12 pr-5 py-3 rounded-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 focus:border-primary focus:ring-2 focus:ring-primary/20 text-slate-900 dark:text-white font-medium transition-all outline-none" 
                                        placeholder="Select date" 
                                        type="date" 
                                        value={otStartDate}
                                        onChange={(e) => setOtStartDate(e.target.value)}
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wide">Cut-off End</label>
                                <div className="relative group/input">
                                    <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none">
                                        <span className="material-symbols-outlined text-primary group-focus-within/input:text-primary transition-colors">date_range</span>
                                    </div>
                                    <input 
                                        className="w-full pl-12 pr-5 py-3 rounded-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 focus:border-primary focus:ring-2 focus:ring-primary/20 text-slate-900 dark:text-white font-medium transition-all outline-none" 
                                        placeholder="Select date" 
                                        type="date" 
                                        value={otEndDate}
                                        onChange={(e) => setOtEndDate(e.target.value)}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </main>

                <footer className="sticky bottom-4 z-20">
                    <div className="max-w-[1280px] mx-auto">
                        <div className="bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-full p-4 pl-8 shadow-2xl flex flex-col sm:flex-row items-center justify-between gap-4 border border-slate-800 dark:border-slate-200">
                            <div className="flex items-center gap-3">
                                <span className="material-symbols-outlined text-primary dark:text-amber-600">info</span>
                                <p className="text-sm font-medium">Please verify all dates before proceeding to ledger generation.</p>
                            </div>
                            <button 
                                onClick={handleGenerateDraft}
                                disabled={isLoading}
                                className="w-full sm:w-auto px-8 py-3 bg-primary hover:bg-[#e0dd05] active:scale-95 text-slate-900 font-bold rounded-full transition-all flex items-center justify-center gap-2 group disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <span>{isLoading ? 'Generating...' : 'Generate Draft Ledger'}</span>
                                {!isLoading && <span className="material-symbols-outlined group-hover:translate-x-1 transition-transform">arrow_forward</span>}
                                {isLoading && <span className="material-symbols-outlined animate-spin">progress_activity</span>}
                            </button>
                        </div>
                    </div>
                </footer>
            </div>
            <div className="fixed top-0 right-0 -z-10 w-[500px] h-[500px] bg-primary/5 rounded-full blur-3xl translate-x-1/2 -translate-y-1/2"></div>
            <div className="fixed bottom-0 left-0 -z-10 w-[400px] h-[400px] bg-blue-500/5 rounded-full blur-3xl -translate-x-1/2 translate-y-1/2"></div>

            {/* Toast Notification */}
            {toast && (
                <div className={`fixed top-6 right-6 z-50 flex items-center gap-3 px-6 py-4 rounded-xl shadow-2xl border transition-all animate-in slide-in-from-top-2 ${
                    toast.type === 'success' 
                        ? 'bg-emerald-50 dark:bg-emerald-900/90 border-emerald-200 dark:border-emerald-700 text-emerald-800 dark:text-emerald-100' 
                        : 'bg-red-50 dark:bg-red-900/90 border-red-200 dark:border-red-700 text-red-800 dark:text-red-100'
                }`}>
                    <span className="material-symbols-outlined">
                        {toast.type === 'success' ? 'check_circle' : 'error'}
                    </span>
                    <span className="font-medium">{toast.message}</span>
                    <button 
                        onClick={() => setToast(null)}
                        className="ml-2 hover:opacity-70 transition-opacity"
                    >
                        <span className="material-symbols-outlined text-lg">close</span>
                    </button>
                </div>
            )}
        </div>
    );
};

export default PayrollCockpitScreen;
