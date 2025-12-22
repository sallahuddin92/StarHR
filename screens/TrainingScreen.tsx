import React, { useState } from 'react';
import { Screen } from '../App';

interface TrainingScreenProps {
    onNavigate: (screen: Screen) => void;
}

interface Course {
    id: string;
    title: string;
    category: string;
    duration: string;
    level: 'beginner' | 'intermediate' | 'advanced';
    instructor: string;
    enrolled: number;
    maxCapacity: number;
    rating: number;
    thumbnail: string;
    mandatory: boolean;
}

interface Employee {
    id: string;
    name: string;
    department: string;
}

const MOCK_COURSES: Course[] = [
    { id: '1', title: 'Workplace Safety & Compliance', category: 'Compliance', duration: '2 hours', level: 'beginner', instructor: 'HR Department', enrolled: 45, maxCapacity: 100, rating: 4.5, thumbnail: '🛡️', mandatory: true },
    { id: '2', title: 'Leadership Excellence Program', category: 'Leadership', duration: '8 hours', level: 'advanced', instructor: 'John Maxwell', enrolled: 12, maxCapacity: 20, rating: 4.8, thumbnail: '👔', mandatory: false },
    { id: '3', title: 'Microsoft Excel Advanced', category: 'Technical', duration: '4 hours', level: 'intermediate', instructor: 'Tech Academy', enrolled: 28, maxCapacity: 50, rating: 4.3, thumbnail: '📊', mandatory: false },
    { id: '4', title: 'Effective Communication Skills', category: 'Soft Skills', duration: '3 hours', level: 'beginner', instructor: 'Dale Carnegie', enrolled: 35, maxCapacity: 40, rating: 4.6, thumbnail: '💬', mandatory: false },
    { id: '5', title: 'Data Protection & PDPA', category: 'Compliance', duration: '1.5 hours', level: 'beginner', instructor: 'Legal Team', enrolled: 52, maxCapacity: 100, rating: 4.2, thumbnail: '🔐', mandatory: true },
    { id: '6', title: 'Project Management Fundamentals', category: 'Management', duration: '6 hours', level: 'intermediate', instructor: 'PMI Certified', enrolled: 18, maxCapacity: 30, rating: 4.7, thumbnail: '📋', mandatory: false },
];

const MOCK_EMPLOYEES: Employee[] = [
    { id: 'EMP001', name: 'Ahmad bin Abdullah', department: 'Engineering' },
    { id: 'EMP-001', name: 'Sarah Jenkins', department: 'Marketing' },
    { id: 'EMP-004', name: 'Mike Ross', department: 'Sales' },
    { id: 'EMP-012', name: 'Jessica Pearson', department: 'Legal' },
];

const LEVEL_STYLES = {
    beginner: { bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-700 dark:text-green-400' },
    intermediate: { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-700 dark:text-blue-400' },
    advanced: { bg: 'bg-purple-100 dark:bg-purple-900/30', text: 'text-purple-700 dark:text-purple-400' },
};

const TrainingScreen: React.FC<TrainingScreenProps> = ({ onNavigate }) => {
    const [courses] = useState<Course[]>(MOCK_COURSES);
    const [filter, setFilter] = useState<string>('all');
    const [showAssignModal, setShowAssignModal] = useState(false);
    const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
    const [selectedEmployees, setSelectedEmployees] = useState<Set<string>>(new Set());

    const categories = ['all', ...new Set(courses.map(c => c.category))];
    const filteredCourses = filter === 'all' ? courses : courses.filter(c => c.category === filter);

    const handleAssign = (course: Course) => {
        setSelectedCourse(course);
        setSelectedEmployees(new Set());
        setShowAssignModal(true);
    };

    const handleConfirmAssign = () => {
        // In real app, would make API call
        setShowAssignModal(false);
        setSelectedCourse(null);
    };

    const toggleEmployee = (id: string) => {
        const newSet = new Set(selectedEmployees);
        if (newSet.has(id)) {
            newSet.delete(id);
        } else {
            newSet.add(id);
        }
        setSelectedEmployees(newSet);
    };

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-[#181811] dark:text-white">Training & Development</h1>
                    <p className="text-[#8c8b5f] text-sm mt-1">Manage employee training programs and certifications</p>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-4 gap-4">
                {[
                    { label: 'Total Courses', value: courses.length, icon: 'school', color: 'bg-blue-500' },
                    { label: 'Mandatory', value: courses.filter(c => c.mandatory).length, icon: 'verified', color: 'bg-red-500' },
                    { label: 'Total Enrolled', value: courses.reduce((sum, c) => sum + c.enrolled, 0), icon: 'group', color: 'bg-green-500' },
                    { label: 'Avg Rating', value: (courses.reduce((sum, c) => sum + c.rating, 0) / courses.length).toFixed(1), icon: 'star', color: 'bg-amber-500' },
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

            {/* Filters */}
            <div className="flex gap-2">
                {categories.map(cat => (
                    <button
                        key={cat}
                        onClick={() => setFilter(cat)}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${filter === cat
                                ? 'bg-primary text-[#181811]'
                                : 'bg-[#f5f5f0] dark:bg-[#2e2d15] text-[#8c8b5f] hover:bg-[#e5e5e0] dark:hover:bg-[#3e3d25]'
                            }`}
                    >
                        {cat.charAt(0).toUpperCase() + cat.slice(1)}
                    </button>
                ))}
            </div>

            {/* Course Grid */}
            <div className="grid grid-cols-3 gap-6">
                {filteredCourses.map(course => (
                    <div key={course.id} className="bg-surface-light dark:bg-surface-dark rounded-xl border border-[#e5e5e0] dark:border-[#3e3d25] overflow-hidden hover:shadow-lg transition-shadow">
                        {/* Thumbnail */}
                        <div className="h-32 bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center text-5xl relative">
                            {course.thumbnail}
                            {course.mandatory && (
                                <span className="absolute top-3 right-3 px-2 py-1 bg-red-500 text-white text-xs font-bold rounded">
                                    MANDATORY
                                </span>
                            )}
                        </div>

                        {/* Content */}
                        <div className="p-5">
                            <div className="flex items-start justify-between mb-2">
                                <span className={`px-2 py-0.5 rounded text-xs font-medium ${LEVEL_STYLES[course.level].bg} ${LEVEL_STYLES[course.level].text}`}>
                                    {course.level.charAt(0).toUpperCase() + course.level.slice(1)}
                                </span>
                                <div className="flex items-center gap-1 text-amber-500">
                                    <span className="material-symbols-outlined text-[16px]">star</span>
                                    <span className="text-sm font-medium">{course.rating}</span>
                                </div>
                            </div>

                            <h3 className="font-bold text-[#181811] dark:text-white mb-1">{course.title}</h3>
                            <p className="text-sm text-[#8c8b5f] mb-3">{course.instructor}</p>

                            <div className="flex items-center gap-4 text-xs text-[#8c8b5f] mb-4">
                                <div className="flex items-center gap-1">
                                    <span className="material-symbols-outlined text-[14px]">schedule</span>
                                    {course.duration}
                                </div>
                                <div className="flex items-center gap-1">
                                    <span className="material-symbols-outlined text-[14px]">group</span>
                                    {course.enrolled}/{course.maxCapacity}
                                </div>
                            </div>

                            {/* Progress bar for enrollment */}
                            <div className="w-full h-1.5 bg-[#e5e5e0] dark:bg-[#3e3d25] rounded-full overflow-hidden mb-4">
                                <div
                                    className="h-full bg-primary rounded-full"
                                    style={{ width: `${(course.enrolled / course.maxCapacity) * 100}%` }}
                                />
                            </div>

                            <button
                                onClick={() => handleAssign(course)}
                                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-primary hover:bg-primary/90 text-[#181811] font-semibold rounded-lg transition-colors"
                            >
                                <span className="material-symbols-outlined text-[18px]">person_add</span>
                                Assign Training
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            {/* Assign Training Modal */}
            {showAssignModal && selectedCourse && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
                    <div className="bg-white dark:bg-[#23220f] rounded-xl shadow-2xl w-full max-w-md mx-4 p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-xl font-bold text-[#181811] dark:text-white">Assign Training</h2>
                            <button onClick={() => setShowAssignModal(false)} className="p-1 hover:bg-gray-100 dark:hover:bg-[#3e3d25] rounded">
                                <span className="material-symbols-outlined text-[#8c8b5f]">close</span>
                            </button>
                        </div>

                        <div className="p-4 bg-[#f9f9f7] dark:bg-[#1a1909] rounded-lg mb-4">
                            <p className="font-semibold text-[#181811] dark:text-white">{selectedCourse.title}</p>
                            <p className="text-sm text-[#8c8b5f]">{selectedCourse.duration} • {selectedCourse.level}</p>
                        </div>

                        <p className="text-sm font-medium text-[#181811] dark:text-white mb-3">Select Employees</p>
                        <div className="space-y-2 max-h-60 overflow-y-auto">
                            {MOCK_EMPLOYEES.map(emp => (
                                <label
                                    key={emp.id}
                                    className="flex items-center gap-3 p-3 rounded-lg border border-[#e5e5e0] dark:border-[#3e3d25] hover:bg-[#f9f9f7] dark:hover:bg-[#1a1909] cursor-pointer"
                                >
                                    <input
                                        type="checkbox"
                                        checked={selectedEmployees.has(emp.id)}
                                        onChange={() => toggleEmployee(emp.id)}
                                        className="rounded border-gray-300 text-primary focus:ring-primary"
                                    />
                                    <div>
                                        <p className="font-medium text-[#181811] dark:text-white">{emp.name}</p>
                                        <p className="text-xs text-[#8c8b5f]">{emp.department}</p>
                                    </div>
                                </label>
                            ))}
                        </div>

                        <div className="flex gap-3 mt-6">
                            <button
                                onClick={() => setShowAssignModal(false)}
                                className="flex-1 px-4 py-2.5 border border-[#e5e5e0] dark:border-[#3e3d25] rounded-lg font-medium hover:bg-gray-50 dark:hover:bg-[#2e2d15]"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleConfirmAssign}
                                disabled={selectedEmployees.size === 0}
                                className="flex-1 px-4 py-2.5 bg-primary hover:bg-primary/90 text-[#181811] font-semibold rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Assign ({selectedEmployees.size})
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TrainingScreen;
