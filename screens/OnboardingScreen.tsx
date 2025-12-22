import React, { useState } from 'react';
import { Screen } from '../App';

interface OnboardingScreenProps {
    onNavigate: (screen: Screen) => void;
}

interface Candidate {
    id: string;
    name: string;
    email: string;
    position: string;
    department: string;
    stage: 'new' | 'interview' | 'offer' | 'active';
    appliedDate: string;
    avatarUrl?: string;
}

const MOCK_CANDIDATES: Candidate[] = [
    { id: '1', name: 'Sarah Chen', email: 'sarah.chen@email.com', position: 'Senior Developer', department: 'Engineering', stage: 'new', appliedDate: '2025-12-20' },
    { id: '2', name: 'James Wilson', email: 'james.w@email.com', position: 'Product Manager', department: 'Product', stage: 'interview', appliedDate: '2025-12-18' },
    { id: '3', name: 'Maria Garcia', email: 'maria.g@email.com', position: 'UX Designer', department: 'Design', stage: 'interview', appliedDate: '2025-12-15' },
    { id: '4', name: 'Ahmed Hassan', email: 'ahmed.h@email.com', position: 'DevOps Engineer', department: 'Engineering', stage: 'offer', appliedDate: '2025-12-10' },
    { id: '5', name: 'Lisa Thompson', email: 'lisa.t@email.com', position: 'HR Specialist', department: 'HR', stage: 'active', appliedDate: '2025-12-01' },
];

const STAGES = [
    { id: 'new', name: 'New Applicants', icon: 'person_add', color: 'bg-blue-500' },
    { id: 'interview', name: 'Interview', icon: 'groups', color: 'bg-amber-500' },
    { id: 'offer', name: 'Offer Extended', icon: 'description', color: 'bg-purple-500' },
    { id: 'active', name: 'Onboarded', icon: 'check_circle', color: 'bg-green-500' },
] as const;

const OnboardingScreen: React.FC<OnboardingScreenProps> = ({ onNavigate }) => {
    const [candidates, setCandidates] = useState<Candidate[]>(MOCK_CANDIDATES);
    const [showAddModal, setShowAddModal] = useState(false);
    const [newCandidate, setNewCandidate] = useState({ name: '', email: '', position: '', department: 'Engineering' });
    const [draggedId, setDraggedId] = useState<string | null>(null);

    const handleDragStart = (id: string) => setDraggedId(id);
    const handleDragOver = (e: React.DragEvent) => e.preventDefault();

    const handleDrop = (stage: Candidate['stage']) => {
        if (draggedId) {
            setCandidates(prev => prev.map(c => c.id === draggedId ? { ...c, stage } : c));
            setDraggedId(null);
        }
    };

    const handleAddCandidate = () => {
        if (!newCandidate.name || !newCandidate.email || !newCandidate.position) return;
        const candidate: Candidate = {
            id: `new-${Date.now()}`,
            ...newCandidate,
            stage: 'new',
            appliedDate: new Date().toISOString().slice(0, 10),
        };
        setCandidates([candidate, ...candidates]);
        setNewCandidate({ name: '', email: '', position: '', department: 'Engineering' });
        setShowAddModal(false);
    };

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-[#181811] dark:text-white">On/Offboarding</h1>
                    <p className="text-[#8c8b5f] text-sm mt-1">Track candidates through the hiring pipeline</p>
                </div>
                <button
                    onClick={() => setShowAddModal(true)}
                    className="flex items-center gap-2 px-4 py-2.5 bg-primary hover:bg-primary/90 text-[#181811] font-semibold rounded-lg transition-colors"
                >
                    <span className="material-symbols-outlined text-[20px]">person_add</span>
                    Add Candidate
                </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-4 gap-4">
                {STAGES.map(stage => {
                    const count = candidates.filter(c => c.stage === stage.id).length;
                    return (
                        <div key={stage.id} className="bg-surface-light dark:bg-surface-dark rounded-xl p-4 border border-[#e5e5e0] dark:border-[#3e3d25]">
                            <div className="flex items-center gap-3">
                                <div className={`w-10 h-10 rounded-lg ${stage.color} flex items-center justify-center`}>
                                    <span className="material-symbols-outlined text-white">{stage.icon}</span>
                                </div>
                                <div>
                                    <p className="text-2xl font-bold text-[#181811] dark:text-white">{count}</p>
                                    <p className="text-xs text-[#8c8b5f]">{stage.name}</p>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Kanban Board */}
            <div className="grid grid-cols-4 gap-4">
                {STAGES.map(stage => (
                    <div
                        key={stage.id}
                        className="bg-[#f9f9f7] dark:bg-[#1a1909] rounded-xl p-4 min-h-[500px]"
                        onDragOver={handleDragOver}
                        onDrop={() => handleDrop(stage.id)}
                    >
                        <div className="flex items-center gap-2 mb-4">
                            <div className={`w-3 h-3 rounded-full ${stage.color}`}></div>
                            <h3 className="font-semibold text-[#181811] dark:text-white">{stage.name}</h3>
                            <span className="ml-auto text-xs bg-[#e5e5e0] dark:bg-[#3e3d25] px-2 py-0.5 rounded-full">
                                {candidates.filter(c => c.stage === stage.id).length}
                            </span>
                        </div>
                        <div className="space-y-3">
                            {candidates.filter(c => c.stage === stage.id).map(candidate => (
                                <div
                                    key={candidate.id}
                                    draggable
                                    onDragStart={() => handleDragStart(candidate.id)}
                                    className="bg-white dark:bg-[#23220f] rounded-lg p-4 border border-[#e5e5e0] dark:border-[#3e3d25] cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow"
                                >
                                    <div className="flex items-start gap-3">
                                        <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-sm font-bold text-[#181811]">
                                            {candidate.name.split(' ').map(n => n[0]).join('')}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-semibold text-[#181811] dark:text-white truncate">{candidate.name}</p>
                                            <p className="text-xs text-[#8c8b5f] truncate">{candidate.position}</p>
                                            <div className="flex items-center gap-2 mt-2">
                                                <span className="text-xs px-2 py-0.5 rounded bg-[#f5f5f0] dark:bg-[#2e2d15] text-[#8c8b5f]">{candidate.department}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>

            {/* Add Candidate Modal */}
            {showAddModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
                    <div className="bg-white dark:bg-[#23220f] rounded-xl shadow-2xl w-full max-w-md mx-4 p-6">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-xl font-bold text-[#181811] dark:text-white">Add New Candidate</h2>
                            <button onClick={() => setShowAddModal(false)} className="p-1 hover:bg-gray-100 dark:hover:bg-[#3e3d25] rounded">
                                <span className="material-symbols-outlined text-[#8c8b5f]">close</span>
                            </button>
                        </div>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-[#181811] dark:text-white mb-1">Full Name</label>
                                <input
                                    type="text"
                                    value={newCandidate.name}
                                    onChange={e => setNewCandidate({ ...newCandidate, name: e.target.value })}
                                    className="w-full px-3 py-2 rounded-lg border border-[#e5e5e0] dark:border-[#3e3d25] bg-transparent focus:ring-2 focus:ring-primary focus:border-transparent"
                                    placeholder="John Doe"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-[#181811] dark:text-white mb-1">Email</label>
                                <input
                                    type="email"
                                    value={newCandidate.email}
                                    onChange={e => setNewCandidate({ ...newCandidate, email: e.target.value })}
                                    className="w-full px-3 py-2 rounded-lg border border-[#e5e5e0] dark:border-[#3e3d25] bg-transparent focus:ring-2 focus:ring-primary focus:border-transparent"
                                    placeholder="john@example.com"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-[#181811] dark:text-white mb-1">Position</label>
                                <input
                                    type="text"
                                    value={newCandidate.position}
                                    onChange={e => setNewCandidate({ ...newCandidate, position: e.target.value })}
                                    className="w-full px-3 py-2 rounded-lg border border-[#e5e5e0] dark:border-[#3e3d25] bg-transparent focus:ring-2 focus:ring-primary focus:border-transparent"
                                    placeholder="Software Engineer"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-[#181811] dark:text-white mb-1">Department</label>
                                <select
                                    value={newCandidate.department}
                                    onChange={e => setNewCandidate({ ...newCandidate, department: e.target.value })}
                                    className="w-full px-3 py-2 rounded-lg border border-[#e5e5e0] dark:border-[#3e3d25] bg-transparent focus:ring-2 focus:ring-primary focus:border-transparent"
                                >
                                    <option value="Engineering">Engineering</option>
                                    <option value="Product">Product</option>
                                    <option value="Design">Design</option>
                                    <option value="HR">HR</option>
                                    <option value="Finance">Finance</option>
                                    <option value="Marketing">Marketing</option>
                                </select>
                            </div>
                        </div>
                        <div className="flex gap-3 mt-6">
                            <button
                                onClick={() => setShowAddModal(false)}
                                className="flex-1 px-4 py-2.5 border border-[#e5e5e0] dark:border-[#3e3d25] rounded-lg font-medium hover:bg-gray-50 dark:hover:bg-[#2e2d15]"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleAddCandidate}
                                className="flex-1 px-4 py-2.5 bg-primary hover:bg-primary/90 text-[#181811] font-semibold rounded-lg"
                            >
                                Add Candidate
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default OnboardingScreen;
