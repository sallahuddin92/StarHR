
import React from 'react';

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

const PayrollCockpitScreen: React.FC = () => {
    return (
        <div className="bg-background-light dark:bg-background-dark font-display text-slate-900 dark:text-slate-100 antialiased min-h-screen flex flex-col overflow-x-hidden">
            <div className="relative flex flex-col grow w-full max-w-[1280px] mx-auto px-4 md:px-8 lg:px-12 py-8">
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
                                    <span className="font-medium text-slate-700 dark:text-slate-200">01 September 2023</span>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">End Date</label>
                                <div className="flex items-center gap-3 px-5 py-3 rounded-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 opacity-70">
                                    <span className="material-symbols-outlined text-slate-400">event</span>
                                    <span className="font-medium text-slate-700 dark:text-slate-200">30 September 2023</span>
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
                                    <input className="w-full pl-12 pr-5 py-3 rounded-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 focus:border-primary focus:ring-2 focus:ring-primary/20 text-slate-900 dark:text-white font-medium transition-all outline-none" placeholder="Select date" type="text" defaultValue="26 August 2023" />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wide">Cut-off End</label>
                                <div className="relative group/input">
                                    <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none">
                                        <span className="material-symbols-outlined text-primary group-focus-within/input:text-primary transition-colors">date_range</span>
                                    </div>
                                    <input className="w-full pl-12 pr-5 py-3 rounded-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 focus:border-primary focus:ring-2 focus:ring-primary/20 text-slate-900 dark:text-white font-medium transition-all outline-none" placeholder="Select date" type="text" defaultValue="25 September 2023" />
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
                            <button className="w-full sm:w-auto px-8 py-3 bg-primary hover:bg-[#e0dd05] active:scale-95 text-slate-900 font-bold rounded-full transition-all flex items-center justify-center gap-2 group">
                                <span>Generate Draft Ledger</span>
                                <span className="material-symbols-outlined group-hover:translate-x-1 transition-transform">arrow_forward</span>
                            </button>
                        </div>
                    </div>
                </footer>
            </div>
            <div className="fixed top-0 right-0 -z-10 w-[500px] h-[500px] bg-primary/5 rounded-full blur-3xl translate-x-1/2 -translate-y-1/2"></div>
            <div className="fixed bottom-0 left-0 -z-10 w-[400px] h-[400px] bg-blue-500/5 rounded-full blur-3xl -translate-x-1/2 translate-y-1/2"></div>
        </div>
    );
};

export default PayrollCockpitScreen;
