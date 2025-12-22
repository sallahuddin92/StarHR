import React, { useState } from 'react';
import { Screen } from '../App';

interface ProjectCostingScreenProps {
    onNavigate: (screen: Screen) => void;
}

interface Project {
    id: string;
    name: string;
    client: string;
    status: 'active' | 'completed' | 'on-hold';
    budget: number;
    spent: number;
    totalHours: number;
    employees: number;
}

interface TimeEntry {
    id: string;
    employeeName: string;
    employeeId: string;
    projectId: string;
    projectName: string;
    date: string;
    hours: number;
    description: string;
}

const MOCK_PROJECTS: Project[] = [
    { id: 'PRJ-001', name: 'ERP Implementation', client: 'Maybank', status: 'active', budget: 250000, spent: 145000, totalHours: 1250, employees: 8 },
    { id: 'PRJ-002', name: 'Mobile App Development', client: 'AirAsia', status: 'active', budget: 180000, spent: 92000, totalHours: 820, employees: 5 },
    { id: 'PRJ-003', name: 'Cloud Migration', client: 'Petronas', status: 'on-hold', budget: 320000, spent: 78000, totalHours: 540, employees: 6 },
    { id: 'PRJ-004', name: 'Website Redesign', client: 'Grab MY', status: 'completed', budget: 75000, spent: 72000, totalHours: 380, employees: 3 },
];

const MOCK_TIME_ENTRIES: TimeEntry[] = [
    { id: '1', employeeName: 'Ahmad bin Abdullah', employeeId: 'EMP001', projectId: 'PRJ-001', projectName: 'ERP Implementation', date: '2025-12-22', hours: 8, description: 'Backend API development' },
    { id: '2', employeeName: 'Sarah Jenkins', employeeId: 'EMP-001', projectId: 'PRJ-002', projectName: 'Mobile App Development', date: '2025-12-22', hours: 6, description: 'UI/UX review' },
    { id: '3', employeeName: 'Mike Ross', employeeId: 'EMP-004', projectId: 'PRJ-001', projectName: 'ERP Implementation', date: '2025-12-22', hours: 7, description: 'Client meeting' },
    { id: '4', employeeName: 'Jessica Pearson', employeeId: 'EMP-012', projectId: 'PRJ-003', projectName: 'Cloud Migration', date: '2025-12-21', hours: 4, description: 'Legal documentation' },
];

const STATUS_STYLES = {
    'active': { bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-700 dark:text-green-400' },
    'completed': { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-700 dark:text-blue-400' },
    'on-hold': { bg: 'bg-amber-100 dark:bg-amber-900/30', text: 'text-amber-700 dark:text-amber-400' },
};

const ProjectCostingScreen: React.FC<ProjectCostingScreenProps> = ({ onNavigate }) => {
    const [projects] = useState<Project[]>(MOCK_PROJECTS);
    const [timeEntries] = useState<TimeEntry[]>(MOCK_TIME_ENTRIES);
    const [selectedProject, setSelectedProject] = useState<string | null>(null);
    const [showTagModal, setShowTagModal] = useState(false);
    const [tagData, setTagData] = useState({ projectId: '', hours: '' });

    const formatCurrency = (amount: number) => new Intl.NumberFormat('en-MY', { style: 'currency', currency: 'MYR', maximumFractionDigits: 0 }).format(amount);

    const totalBudget = projects.reduce((sum, p) => sum + p.budget, 0);
    const totalSpent = projects.reduce((sum, p) => sum + p.spent, 0);
    const totalHours = projects.reduce((sum, p) => sum + p.totalHours, 0);

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-[#181811] dark:text-white">Project Costing</h1>
                    <p className="text-[#8c8b5f] text-sm mt-1">Track project budgets and employee hours allocation</p>
                </div>
                <button
                    onClick={() => setShowTagModal(true)}
                    className="flex items-center gap-2 px-4 py-2.5 bg-primary hover:bg-primary/90 text-[#181811] font-semibold rounded-lg transition-colors"
                >
                    <span className="material-symbols-outlined text-[20px]">label</span>
                    Tag Hours to Project
                </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-4 gap-4">
                {[
                    { label: 'Active Projects', value: projects.filter(p => p.status === 'active').length, icon: 'folder_open', color: 'bg-blue-500' },
                    { label: 'Total Budget', value: formatCurrency(totalBudget), icon: 'account_balance', color: 'bg-green-500' },
                    { label: 'Total Spent', value: formatCurrency(totalSpent), icon: 'payments', color: 'bg-amber-500' },
                    { label: 'Total Hours', value: totalHours.toLocaleString(), icon: 'schedule', color: 'bg-purple-500' },
                ].map((stat, idx) => (
                    <div key={idx} className="bg-surface-light dark:bg-surface-dark rounded-xl p-4 border border-[#e5e5e0] dark:border-[#3e3d25]">
                        <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-lg ${stat.color} flex items-center justify-center`}>
                                <span className="material-symbols-outlined text-white">{stat.icon}</span>
                            </div>
                            <div>
                                <p className="text-xl font-bold text-[#181811] dark:text-white">{stat.value}</p>
                                <p className="text-xs text-[#8c8b5f]">{stat.label}</p>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Projects Grid */}
            <div className="grid grid-cols-2 gap-6">
                {/* Project Cards */}
                <div className="space-y-4">
                    <h2 className="font-semibold text-[#181811] dark:text-white">Projects Overview</h2>
                    {projects.map(project => {
                        const progress = (project.spent / project.budget) * 100;
                        const isSelected = selectedProject === project.id;
                        return (
                            <div
                                key={project.id}
                                onClick={() => setSelectedProject(isSelected ? null : project.id)}
                                className={`bg-surface-light dark:bg-surface-dark rounded-xl p-5 border cursor-pointer transition-all ${isSelected ? 'border-primary ring-2 ring-primary/20' : 'border-[#e5e5e0] dark:border-[#3e3d25] hover:border-[#8c8b5f]'
                                    }`}
                            >
                                <div className="flex items-start justify-between mb-3">
                                    <div>
                                        <p className="font-bold text-[#181811] dark:text-white">{project.name}</p>
                                        <p className="text-sm text-[#8c8b5f]">{project.client}</p>
                                    </div>
                                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${STATUS_STYLES[project.status].bg} ${STATUS_STYLES[project.status].text}`}>
                                        {project.status.charAt(0).toUpperCase() + project.status.slice(1)}
                                    </span>
                                </div>
                                <div className="space-y-2">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-[#8c8b5f]">Budget Used</span>
                                        <span className="font-semibold text-[#181811] dark:text-white">{formatCurrency(project.spent)} / {formatCurrency(project.budget)}</span>
                                    </div>
                                    <div className="w-full h-2 bg-[#e5e5e0] dark:bg-[#3e3d25] rounded-full overflow-hidden">
                                        <div
                                            className={`h-full rounded-full transition-all ${progress > 90 ? 'bg-red-500' : progress > 70 ? 'bg-amber-500' : 'bg-green-500'}`}
                                            style={{ width: `${Math.min(progress, 100)}%` }}
                                        />
                                    </div>
                                    <div className="flex justify-between text-sm pt-2">
                                        <div className="flex items-center gap-1 text-[#8c8b5f]">
                                            <span className="material-symbols-outlined text-[16px]">schedule</span>
                                            {project.totalHours} hrs
                                        </div>
                                        <div className="flex items-center gap-1 text-[#8c8b5f]">
                                            <span className="material-symbols-outlined text-[16px]">group</span>
                                            {project.employees} members
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Hours Chart / Recent Time Entries */}
                <div className="space-y-4">
                    <h2 className="font-semibold text-[#181811] dark:text-white">Employee Hours Allocation</h2>
                    <div className="bg-surface-light dark:bg-surface-dark rounded-xl border border-[#e5e5e0] dark:border-[#3e3d25] overflow-hidden">
                        {/* Simple Bar Chart */}
                        <div className="p-5 border-b border-[#e5e5e0] dark:border-[#3e3d25]">
                            <p className="text-sm text-[#8c8b5f] mb-4">Hours by Project</p>
                            <div className="space-y-3">
                                {projects.map(project => {
                                    const maxHours = Math.max(...projects.map(p => p.totalHours));
                                    const width = (project.totalHours / maxHours) * 100;
                                    return (
                                        <div key={project.id} className="flex items-center gap-3">
                                            <div className="w-32 text-sm text-[#181811] dark:text-white truncate">{project.name.split(' ')[0]}</div>
                                            <div className="flex-1 h-6 bg-[#f5f5f0] dark:bg-[#2e2d15] rounded overflow-hidden">
                                                <div
                                                    className="h-full bg-gradient-to-r from-primary to-primary/70 rounded flex items-center justify-end pr-2 text-xs font-semibold text-[#181811]"
                                                    style={{ width: `${width}%` }}
                                                >
                                                    {project.totalHours}h
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Recent Time Entries */}
                        <div className="p-5">
                            <p className="text-sm text-[#8c8b5f] mb-4">Recent Time Entries</p>
                            <div className="space-y-3">
                                {timeEntries.slice(0, 4).map(entry => (
                                    <div key={entry.id} className="flex items-center justify-between py-2 border-b border-[#f5f5f0] dark:border-[#2e2d15] last:border-0">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-[#181811]">
                                                {entry.employeeName.split(' ').map(n => n[0]).join('')}
                                            </div>
                                            <div>
                                                <p className="font-medium text-sm text-[#181811] dark:text-white">{entry.employeeName}</p>
                                                <p className="text-xs text-[#8c8b5f]">{entry.projectName}</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="font-semibold text-[#181811] dark:text-white">{entry.hours}h</p>
                                            <p className="text-xs text-[#8c8b5f]">{entry.date}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Tag Hours Modal */}
            {showTagModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
                    <div className="bg-white dark:bg-[#23220f] rounded-xl shadow-2xl w-full max-w-md mx-4 p-6">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-xl font-bold text-[#181811] dark:text-white">Tag Hours to Project</h2>
                            <button onClick={() => setShowTagModal(false)} className="p-1 hover:bg-gray-100 dark:hover:bg-[#3e3d25] rounded">
                                <span className="material-symbols-outlined text-[#8c8b5f]">close</span>
                            </button>
                        </div>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-[#181811] dark:text-white mb-1">Select Project</label>
                                <select
                                    value={tagData.projectId}
                                    onChange={e => setTagData({ ...tagData, projectId: e.target.value })}
                                    className="w-full px-3 py-2 rounded-lg border border-[#e5e5e0] dark:border-[#3e3d25] bg-transparent focus:ring-2 focus:ring-primary focus:border-transparent"
                                >
                                    <option value="">Choose project...</option>
                                    {projects.filter(p => p.status === 'active').map(p => (
                                        <option key={p.id} value={p.id}>{p.name} ({p.client})</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-[#181811] dark:text-white mb-1">Hours</label>
                                <input
                                    type="number"
                                    value={tagData.hours}
                                    onChange={e => setTagData({ ...tagData, hours: e.target.value })}
                                    className="w-full px-3 py-2 rounded-lg border border-[#e5e5e0] dark:border-[#3e3d25] bg-transparent focus:ring-2 focus:ring-primary focus:border-transparent"
                                    placeholder="8"
                                />
                            </div>
                        </div>
                        <div className="flex gap-3 mt-6">
                            <button
                                onClick={() => setShowTagModal(false)}
                                className="flex-1 px-4 py-2.5 border border-[#e5e5e0] dark:border-[#3e3d25] rounded-lg font-medium hover:bg-gray-50 dark:hover:bg-[#2e2d15]"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => setShowTagModal(false)}
                                className="flex-1 px-4 py-2.5 bg-primary hover:bg-primary/90 text-[#181811] font-semibold rounded-lg"
                            >
                                Tag Hours
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ProjectCostingScreen;
