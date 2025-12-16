
import React from 'react';

const SideNav: React.FC = () => (
    <aside className="hidden lg:flex w-72 flex-col justify-between bg-white dark:bg-card-dark border-r border-gray-200 dark:border-gray-800 p-6 fixed h-[calc(100vh-65px)] overflow-y-auto">
        <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-text-sub dark:text-gray-500 px-3 mb-2">Workspace</h3>
                <a className="flex items-center gap-3 px-4 py-3 rounded-full bg-primary text-black font-semibold shadow-sm transition-transform active:scale-95" href="#">
                    <span className="material-symbols-outlined">inbox</span>
                    <span>Approvals</span>
                    <span className="ml-auto bg-black text-primary text-xs px-2 py-0.5 rounded-full font-bold">3</span>
                </a>
                <a className="flex items-center gap-3 px-4 py-3 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-text-main dark:text-gray-300 font-medium transition-colors" href="#">
                    <span className="material-symbols-outlined">group</span>
                    <span>My Team</span>
                </a>
                <a className="flex items-center gap-3 px-4 py-3 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-text-main dark:text-gray-300 font-medium transition-colors" href="#">
                    <span className="material-symbols-outlined">calendar_month</span>
                    <span>Schedule</span>
                </a>
                <a className="flex items-center gap-3 px-4 py-3 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-text-main dark:text-gray-300 font-medium transition-colors" href="#">
                    <span className="material-symbols-outlined">bar_chart</span>
                    <span>Reports</span>
                </a>
            </div>
            <div className="h-px bg-gray-200 dark:bg-gray-700 mx-3"></div>
            <div className="flex flex-col gap-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-text-sub dark:text-gray-500 px-3 mb-2">History</h3>
                <a className="flex items-center gap-3 px-4 py-3 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-text-main dark:text-gray-300 font-medium transition-colors" href="#">
                    <span className="material-symbols-outlined">history</span>
                    <span>Past Actions</span>
                </a>
                <a className="flex items-center gap-3 px-4 py-3 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-text-main dark:text-gray-300 font-medium transition-colors" href="#">
                    <span className="material-symbols-outlined">archive</span>
                    <span>Archived</span>
                </a>
            </div>
        </div>
        <div className="p-4 bg-background-light dark:bg-background-dark/50 rounded-2xl border border-gray-100 dark:border-gray-700">
            <p className="text-xs text-text-sub dark:text-gray-400 font-medium mb-2">Enterprise Plan</p>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mb-2">
                <div className="bg-primary h-2 rounded-full w-3/4"></div>
            </div>
            <p className="text-xs text-text-main dark:text-gray-300">75% of actions completed</p>
        </div>
    </aside>
);

const AppHeader: React.FC = () => (
    <header className="sticky top-0 z-50 flex items-center justify-between whitespace-nowrap border-b border-solid border-gray-200 dark:border-gray-800 bg-white/80 dark:bg-background-dark/80 backdrop-blur-md px-6 lg:px-10 py-3">
        <div className="flex items-center gap-4 text-text-main dark:text-white">
            <div className="size-8 flex items-center justify-center bg-primary rounded-full text-black">
                <span className="material-symbols-outlined text-xl">bolt</span>
            </div>
            <h2 className="text-text-main dark:text-white text-lg font-bold leading-tight tracking-[-0.015em]">HR Portal</h2>
        </div>
        <div className="flex flex-1 justify-end gap-6 items-center">
            <button className="relative flex size-10 cursor-pointer items-center justify-center overflow-hidden rounded-full bg-white dark:bg-card-dark border border-gray-200 dark:border-gray-700 text-text-main dark:text-white hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                <span className="material-symbols-outlined">notifications</span>
                <span className="absolute top-2 right-2 size-2 bg-red-500 rounded-full border border-white dark:border-card-dark"></span>
            </button>
            <div className="flex items-center gap-3 pl-4 border-l border-gray-200 dark:border-gray-700">
                <div className="hidden md:flex flex-col items-end">
                    <span className="text-sm font-bold">Alex Morgan</span>
                    <span className="text-xs text-text-sub dark:text-gray-400">Regional Manager</span>
                </div>
                <div className="bg-center bg-no-repeat bg-cover rounded-full size-10 ring-2 ring-gray-100 dark:ring-gray-800" style={{backgroundImage: `url("https://picsum.photos/id/433/100/100")`}}></div>
            </div>
        </div>
    </header>
);


const PendingApprovalsScreen: React.FC = () => {
    return (
        <div className="bg-background-light dark:bg-background-dark min-h-screen flex flex-col font-display text-text-main dark:text-gray-100">
            <div className="flex flex-col h-full min-h-screen">
                <AppHeader />
                <div className="flex flex-1 overflow-hidden">
                    <SideNav />
                    <main className="flex-1 lg:ml-72 flex justify-center py-8 px-4 sm:px-8 lg:px-12 overflow-y-auto">
                        <div className="w-full max-w-[960px] flex flex-col gap-8 pb-20">
                            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                                <div className="flex flex-col gap-2">
                                    <h1 className="text-text-main dark:text-white text-4xl font-black leading-tight tracking-[-0.033em]">Pending Approvals</h1>
                                    <p className="text-text-sub dark:text-gray-400 text-base font-normal">Review and action time-off and overtime requests from your team.</p>
                                </div>
                                <div className="text-right">
                                    <span className="text-sm font-medium text-text-sub dark:text-gray-400">Last synced: Just now</span>
                                </div>
                            </div>
                            <div className="flex flex-col md:flex-row gap-4 items-center">
                                <div className="relative w-full md:w-96 group">
                                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-text-sub dark:text-gray-400 group-focus-within:text-primary transition-colors"><span className="material-symbols-outlined">search</span></div>
                                    <input className="w-full h-12 pl-12 pr-4 bg-white dark:bg-card-dark border border-gray-200 dark:border-gray-700 rounded-full focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-text-main dark:text-white placeholder:text-text-sub transition-shadow" placeholder="Search by name, ID, or type..." type="text" />
                                </div>
                                <div className="flex gap-2 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
                                    <button className="flex h-10 shrink-0 items-center gap-2 rounded-full bg-black dark:bg-white text-primary dark:text-black border border-transparent px-4 font-bold text-sm transition-transform active:scale-95"><span className="material-symbols-outlined text-[18px]">inbox</span> Pending (3)</button>
                                    <button className="flex h-10 shrink-0 items-center gap-2 rounded-full bg-white dark:bg-card-dark text-text-main dark:text-gray-300 border border-gray-200 dark:border-gray-700 px-4 font-medium text-sm hover:border-gray-300 dark:hover:border-gray-600 transition-colors"><span className="material-symbols-outlined text-[18px]">warning</span> Urgent</button>
                                    <button className="flex h-10 shrink-0 items-center gap-2 rounded-full bg-white dark:bg-card-dark text-text-main dark:text-gray-300 border border-gray-200 dark:border-gray-700 px-4 font-medium text-sm hover:border-gray-300 dark:hover:border-gray-600 transition-colors"><span className="material-symbols-outlined text-[18px]">check_circle</span> Approved</button>
                                </div>
                            </div>
                            
                            <div className="flex flex-col gap-6">
                                {/* Card 1 */}
                                <div className="bg-white dark:bg-card-dark rounded-[2rem] p-6 shadow-sm border border-gray-100 dark:border-gray-800 hover:shadow-md transition-shadow">
                                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                                        <div className="flex items-center gap-4">
                                            <div className="bg-center bg-no-repeat bg-cover rounded-full size-14 border-2 border-white dark:border-gray-700 shadow-sm" style={{backgroundImage: `url('https://picsum.photos/id/342/140/140')`}}></div>
                                            <div className="flex flex-col">
                                                <h3 className="text-xl font-bold text-text-main dark:text-white">Sarah Jenkins</h3>
                                                <div className="flex items-center gap-2 text-sm text-text-sub dark:text-gray-400 font-mono"><span>#8821</span><span className="size-1 bg-gray-300 rounded-full"></span><span>Product Designer</span></div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2 bg-yellow-50 dark:bg-yellow-900/20 px-3 py-1.5 rounded-full border border-yellow-100 dark:border-yellow-900/30"><span className="material-symbols-outlined text-amber-600 dark:text-amber-400 text-sm">schedule</span><span className="text-xs font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wide">Submitted Oct 24</span></div>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-12 gap-6 mb-8">
                                        <div className="col-span-1 md:col-span-8 bg-background-light dark:bg-background-dark/50 rounded-3xl p-5 border border-gray-100 dark:border-gray-700">
                                            <div className="flex justify-between items-center mb-4 pb-2 border-b border-gray-200 dark:border-gray-700"><span className="text-xs font-bold uppercase tracking-wider text-text-sub dark:text-gray-500">Shift Details</span><span className="text-xs font-mono text-text-sub dark:text-gray-500">ID: REQ-2023-992</span></div>
                                            <div className="grid grid-cols-3 gap-4 font-mono text-sm">
                                                <div className="flex flex-col gap-1"><span className="text-xs text-text-sub dark:text-gray-500">Date</span><span className="font-semibold text-text-main dark:text-gray-200">Oct 23, Mon</span></div>
                                                <div className="flex flex-col gap-1"><span className="text-xs text-text-sub dark:text-gray-500">Clock In</span><span className="font-semibold text-text-main dark:text-gray-200">08:00 AM</span></div>
                                                <div className="flex flex-col gap-1"><span className="text-xs text-text-sub dark:text-gray-500">Clock Out</span><span className="font-semibold text-text-main dark:text-gray-200">08:30 PM</span></div>
                                            </div>
                                            <div className="mt-4 pt-3 border-t border-gray-200 dark:border-gray-700"><p className="text-sm italic text-text-main dark:text-gray-300">"Project deadline crunch for the Q4 release. Approved by tech lead."</p></div>
                                        </div>
                                        <div className="col-span-1 md:col-span-4 flex flex-col justify-center items-center bg-primary rounded-3xl p-5 text-center relative overflow-hidden group">
                                            <div className="absolute -right-6 -top-6 size-24 bg-white/20 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-500"></div>
                                            <span className="text-sm font-bold text-black/70 mb-1 z-10">Total Overtime</span><span className="text-5xl font-black text-black tracking-tight z-10">+3.5 <span className="text-2xl font-bold">HRS</span></span>
                                            <div className="mt-2 inline-flex items-center gap-1 bg-black/10 px-2 py-0.5 rounded-md z-10"><span className="material-symbols-outlined text-[16px] text-black">trending_up</span><span className="text-xs font-bold text-black">Above Average</span></div>
                                        </div>
                                    </div>
                                    <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6 pt-4 border-t border-gray-100 dark:border-gray-800">
                                        <div className="flex flex-col gap-2"><span className="text-xs font-bold uppercase tracking-wider text-text-sub dark:text-gray-500 pl-1">Approval Chain: Step 2 of 3</span>
                                            <div className="flex items-center gap-3">
                                                <div className="flex items-center gap-2 opacity-50"><div className="size-6 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center text-green-600 dark:text-green-400"><span className="material-symbols-outlined text-sm font-bold">check</span></div><span className="text-sm font-medium text-text-main dark:text-gray-400">Team Lead</span></div>
                                                <div className="w-8 h-0.5 bg-gray-200 dark:bg-gray-700"></div>
                                                <div className="flex items-center gap-2"><div className="size-6 rounded-full bg-transparent border-2 border-primary flex items-center justify-center relative"><div className="size-2 bg-primary rounded-full animate-pulse"></div></div><span className="text-sm font-bold text-text-main dark:text-white">Manager Review</span></div>
                                                <div className="w-8 h-0.5 bg-gray-200 dark:bg-gray-700"></div>
                                                <div className="flex items-center gap-2 opacity-40 grayscale"><div className="size-6 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-400"><span className="text-[10px] font-bold">3</span></div><span className="text-sm font-medium text-text-main dark:text-gray-400">Payroll</span></div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3 self-end xl:self-auto">
                                            <button className="h-12 px-6 rounded-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-transparent text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 hover:border-red-200 transition-colors font-bold text-sm flex items-center gap-2"><span className="material-symbols-outlined text-[20px]">close</span>Reject</button>
                                            <button className="h-12 px-8 rounded-full bg-black dark:bg-white text-primary dark:text-black hover:bg-gray-900 dark:hover:bg-gray-200 transition-all font-bold text-sm flex items-center gap-2 shadow-lg shadow-black/5 dark:shadow-white/5 active:scale-95"><span className="material-symbols-outlined text-[20px]">check</span>Approve Request</button>
                                        </div>
                                    </div>
                                </div>

                                {/* Card 2 */}
                                <div className="bg-white dark:bg-card-dark rounded-[2rem] p-6 shadow-sm border border-gray-100 dark:border-gray-800 hover:shadow-md transition-shadow">
                                   <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                                        <div className="flex items-center gap-4">
                                            <div className="bg-center bg-no-repeat bg-cover rounded-full size-14 border-2 border-white dark:border-gray-700 shadow-sm" style={{backgroundImage: `url('https://picsum.photos/id/64/140/140')`}}></div>
                                            <div className="flex flex-col">
                                                <h3 className="text-xl font-bold text-text-main dark:text-white">David Chen</h3>
                                                <div className="flex items-center gap-2 text-sm text-text-sub dark:text-gray-400 font-mono"><span>#4402</span><span className="size-1 bg-gray-300 rounded-full"></span><span>Frontend Developer</span></div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2 bg-gray-100 dark:bg-gray-800 px-3 py-1.5 rounded-full"><span className="material-symbols-outlined text-gray-500 dark:text-gray-400 text-sm">calendar_today</span><span className="text-xs font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wide">Submitted Oct 25</span></div>
                                    </div>
                                     <div className="grid grid-cols-1 md:grid-cols-12 gap-6 mb-8">
                                        <div className="col-span-1 md:col-span-8 bg-background-light dark:bg-background-dark/50 rounded-3xl p-5 border border-gray-100 dark:border-gray-700">
                                            <div className="flex justify-between items-center mb-4 pb-2 border-b border-gray-200 dark:border-gray-700"><span className="text-xs font-bold uppercase tracking-wider text-text-sub dark:text-gray-500">Shift Details</span><span className="text-xs font-mono text-text-sub dark:text-gray-500">ID: REQ-2023-998</span></div>
                                            <div className="grid grid-cols-3 gap-4 font-mono text-sm">
                                                <div className="flex flex-col gap-1"><span className="text-xs text-text-sub dark:text-gray-500">Date</span><span className="font-semibold text-text-main dark:text-gray-200">Oct 24, Tue</span></div>
                                                <div className="flex flex-col gap-1"><span className="text-xs text-text-sub dark:text-gray-500">Clock In</span><span className="font-semibold text-text-main dark:text-gray-200">09:00 AM</span></div>
                                                <div className="flex flex-col gap-1"><span className="text-xs text-text-sub dark:text-gray-500">Clock Out</span><span className="font-semibold text-text-main dark:text-gray-200">07:00 PM</span></div>
                                            </div>
                                            <div className="mt-4 pt-3 border-t border-gray-200 dark:border-gray-700"><p className="text-sm italic text-text-main dark:text-gray-300">"Server maintenance support."</p></div>
                                        </div>
                                        <div className="col-span-1 md:col-span-4 flex flex-col justify-center items-center bg-gray-100 dark:bg-gray-800 rounded-3xl p-5 text-center"><span className="text-sm font-bold text-text-sub dark:text-gray-400 mb-1">Total Overtime</span><span className="text-5xl font-black text-primary tracking-tight">+2.0 <span className="text-2xl font-bold">HRS</span></span></div>
                                    </div>
                                    <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6 pt-4 border-t border-gray-100 dark:border-gray-800">
                                        <div className="flex flex-col gap-2"><span className="text-xs font-bold uppercase tracking-wider text-text-sub dark:text-gray-500 pl-1">Approval Chain: Step 1 of 3</span>
                                            <div className="flex items-center gap-3">
                                                <div className="flex items-center gap-2"><div className="size-6 rounded-full bg-transparent border-2 border-primary flex items-center justify-center relative"><div className="size-2 bg-primary rounded-full animate-pulse"></div></div><span className="text-sm font-bold text-text-main dark:text-white">Team Lead</span></div>
                                                <div className="w-8 h-0.5 bg-gray-200 dark:bg-gray-700"></div>
                                                <div className="flex items-center gap-2 opacity-40 grayscale"><div className="size-6 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-400"><span className="text-[10px] font-bold">2</span></div><span className="text-sm font-medium text-text-main dark:text-gray-400">Manager</span></div>
                                                <div className="w-8 h-0.5 bg-gray-200 dark:bg-gray-700"></div>
                                                <div className="flex items-center gap-2 opacity-40 grayscale"><div className="size-6 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-400"><span className="text-[10px] font-bold">3</span></div><span className="text-sm font-medium text-text-main dark:text-gray-400">Payroll</span></div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3 self-end xl:self-auto">
                                            <button className="h-12 px-6 rounded-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-transparent text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 hover:border-red-200 transition-colors font-bold text-sm flex items-center gap-2"><span className="material-symbols-outlined text-[20px]">close</span>Reject</button>
                                            <button className="h-12 px-8 rounded-full bg-black dark:bg-white text-primary dark:text-black hover:bg-gray-900 dark:hover:bg-gray-200 transition-all font-bold text-sm flex items-center gap-2 shadow-lg shadow-black/5 dark:shadow-white/5 active:scale-95"><span className="material-symbols-outlined text-[20px]">check</span>Approve Request</button>
                                        </div>
                                    </div>
                                </div>

                                {/* Card 3 */}
                                <div className="bg-white dark:bg-card-dark rounded-[2rem] p-6 shadow-sm border border-gray-100 dark:border-gray-800 opacity-60 hover:opacity-100 transition-opacity">
                                    <div className="flex items-center gap-3">
                                        <span className="material-symbols-outlined text-text-sub">lock</span>
                                        <span className="text-sm font-medium text-text-sub">Future request from <span className="font-bold text-text-main dark:text-gray-300">Michael Scott</span> is locked until Nov 1st.</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </main>
                </div>
            </div>
        </div>
    );
};

export default PendingApprovalsScreen;
