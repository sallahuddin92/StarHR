import React, { useState, useEffect } from 'react';
import { Screen } from '../App';
import {
  GraduationCap,
  Calendar,
  Users,
  Clock,
  ChevronDown,
  ChevronUp,
  Plus,
  Check,
  X,
  Search,
  Award,
  MapPin,
  AlertTriangle,
} from 'lucide-react';

// ============================================================================
// TYPES
// ============================================================================

interface Course {
  id: string;
  code: string;
  title: string;
  description: string | null;
  category: string | null;
  duration_hours: number | null;
  level: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | null;
  instructor: string | null;
  max_capacity: number | null;
  is_mandatory: boolean;
  rl_eligible: boolean;
  rl_rule_id: string | null;
  rl_rule_name: string | null;
  event_count: number;
  total_allocations: number;
  is_active: boolean;
  is_test: boolean;
  is_archived: boolean;
  eligible_departments: string[] | null;
  eligible_grades: string[] | null;
  eligible_roles: string[] | null;
}

interface TrainingEvent {
  id: string;
  training_id: string;
  training_code: string;
  training_title: string;
  training_category: string | null;
  duration_hours: number | null;
  event_date: string;
  event_end_date: string | null;
  event_time_start: string | null;
  event_time_end: string | null;
  location: string | null;
  location_type: string | null;
  day_type: 'WORKING_DAY' | 'OFF_DAY' | 'REST_DAY' | 'PUBLIC_HOLIDAY';
  rl_eligible: boolean;
  rl_rule_name: string | null;
  rl_credit_days: number | null;
  status: string;
  allocation_count: number;
  attended_count: number;
  completed_count: number;
}

interface Allocation {
  id: string;
  employee_id: string;
  employee_code: string;
  employee_name: string;
  department: string;
  designation: string;
  attendance_status: string;
  completion_status: string;
  hours_attended: number | null;
  rl_eligible: boolean;
  rl_days_potential: number | null;
  rl_credit_id: string | null;
  rl_credit_status: string | null;
  rl_days_credited: number | null;
  allocated_by_name: string;
  completion_confirmed_by_name: string | null;
}

interface Employee {
  id: string;
  employee_id: string;
  full_name: string;
  department: string;
  designation: string;
}

interface TrainingScreenProps {
  onNavigate: (screen: Screen) => void;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const LEVEL_STYLES = {
  BEGINNER: { bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-700 dark:text-green-400' },
  INTERMEDIATE: { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-700 dark:text-blue-400' },
  ADVANCED: {
    bg: 'bg-purple-100 dark:bg-purple-900/30',
    text: 'text-purple-700 dark:text-purple-400',
  },
};

const DAY_TYPE_LABELS: Record<string, { label: string; color: string }> = {
  WORKING_DAY: { label: 'Working Day', color: 'bg-gray-100 text-gray-700' },
  OFF_DAY: { label: 'Off Day', color: 'bg-amber-100 text-amber-700' },
  REST_DAY: { label: 'Rest Day', color: 'bg-blue-100 text-blue-700' },
  PUBLIC_HOLIDAY: { label: 'Public Holiday', color: 'bg-red-100 text-red-700' },
};

const STATUS_COLORS: Record<string, string> = {
  SCHEDULED: 'bg-blue-100 text-blue-700',
  IN_PROGRESS: 'bg-amber-100 text-amber-700',
  COMPLETED: 'bg-green-100 text-green-700',
  CANCELLED: 'bg-red-100 text-red-700',
  DRAFT: 'bg-gray-100 text-gray-700',
};

// ============================================================================
// COMPONENT
// ============================================================================

const TrainingScreen: React.FC<TrainingScreenProps> = ({ onNavigate }) => {
  // State
  const [activeTab, setActiveTab] = useState<'courses' | 'events'>('courses');
  const [courses, setCourses] = useState<Course[]>([]);
  const [events, setEvents] = useState<TrainingEvent[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');

  // Modals
  const [showEventModal, setShowEventModal] = useState(false);
  const [showAllocateModal, setShowAllocateModal] = useState(false);
  const [showAllocationsModal, setShowAllocationsModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Filters
  const [testFilter, setTestFilter] = useState<'all' | 'live' | 'test'>('all');

  // Selected items
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<TrainingEvent | null>(null);
  const [selectedEmployees, setSelectedEmployees] = useState<Set<string>>(new Set());
  const [allocations, setAllocations] = useState<Allocation[]>([]);

  // Event form
  const [eventForm, setEventForm] = useState({
    event_date: new Date().toISOString().split('T')[0],
    event_end_date: '',
    event_time_start: '09:00',
    event_time_end: '17:00',
    location: '',
    location_type: 'ONSITE' as string,
    day_type: 'OFF_DAY' as string,
    rl_eligible: true,
    notes: '',
  });

  // ============================================================================
  // DATA FETCHING
  // ============================================================================

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('authToken');
      const headers = { Authorization: `Bearer ${token}` };

      const [coursesRes, eventsRes, employeesRes] = await Promise.all([
        fetch('/api/training/courses', { headers }),
        fetch('/api/training/events', { headers }),
        fetch('/api/employees', { headers }),
      ]);

      const coursesData = await coursesRes.json();
      const eventsData = await eventsRes.json();
      const employeesData = await employeesRes.json();

      setCourses(coursesData.data || []);
      setEvents(eventsData.data || []);
      setEmployees(employeesData.data || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // ============================================================================
  // HANDLERS
  // ============================================================================

  const handleCreateEvent = async () => {
    if (!selectedCourse) return;

    try {
      const token = localStorage.getItem('authToken');
      const res = await fetch('/api/training/events', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          training_id: selectedCourse.id,
          ...eventForm,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to create event');
      }

      setShowEventModal(false);
      fetchData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleAllocateWorkers = async () => {
    if (!selectedEvent || selectedEmployees.size === 0) return;

    try {
      const token = localStorage.getItem('authToken');
      const res = await fetch(`/api/training/events/${selectedEvent.id}/allocate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          employee_ids: Array.from(selectedEmployees),
          rl_eligible: true,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to allocate');

      alert(
        `Allocated ${data.allocated} worker(s)${data.skipped > 0 ? ` (${data.skipped} already assigned)` : ''}`
      );
      setShowAllocateModal(false);
      setSelectedEmployees(new Set());
      fetchData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleViewAllocations = async (event: TrainingEvent) => {
    setSelectedEvent(event);
    try {
      const token = localStorage.getItem('authToken');
      const res = await fetch(`/api/training/events/${event.id}/allocations`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setAllocations(data.data || []);
      setShowAllocationsModal(true);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleMarkAttendance = async (allocationId: string, status: string) => {
    try {
      const token = localStorage.getItem('authToken');
      await fetch(`/api/training/allocations/${allocationId}/attendance`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ attendance_status: status }),
      });
      handleViewAllocations(selectedEvent!);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleConfirmCompletion = async (
    allocationId: string,
    status: 'COMPLETED' | 'INCOMPLETE'
  ) => {
    try {
      const token = localStorage.getItem('authToken');
      const res = await fetch(`/api/training/allocations/${allocationId}/complete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          completion_status: status,
          completion_notes:
            status === 'COMPLETED' ? 'Confirmed by HR' : 'Did not complete training',
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || data.error || 'Failed to confirm completion');
      }

      if (data.rl_credited) {
        alert(`✅ Completion confirmed! ${data.rl_days} day(s) Replacement Leave credited.`);
      } else {
        alert('Completion status updated.');
      }

      handleViewAllocations(selectedEvent!);
      fetchData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  // ============================================================================
  // HELPERS
  // ============================================================================

  const filteredCourses = courses.filter(
    c =>
      (c.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.code.toLowerCase().includes(searchTerm.toLowerCase())) &&
      (categoryFilter === 'all' || c.category === categoryFilter) &&
      (testFilter === 'all' || (testFilter === 'test' ? c.is_test : !c.is_test))
  );

  const filteredEvents = events.filter(
    e =>
      e.training_title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      e.training_code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const categories = ['all', ...new Set(courses.map(c => c.category).filter(Boolean))];

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-MY', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  // ============================================================================
  // RENDER
  // ============================================================================

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#181811] dark:text-white">Training Management</h1>
          <p className="text-[#8c8b5f] text-sm mt-1">
            Manage training courses, schedule events, and track completion for Replacement Leave
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-primary hover:bg-primary/90 text-[#181811] font-semibold rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          Create Training
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        {[
          {
            label: 'Total Courses',
            value: courses.length,
            icon: GraduationCap,
            color: 'bg-blue-500',
          },
          {
            label: 'Scheduled Events',
            value: events.filter(e => e.status === 'SCHEDULED').length,
            icon: Calendar,
            color: 'bg-amber-500',
          },
          {
            label: 'Total Allocations',
            value: events.reduce((sum, e) => sum + Number(e.allocation_count), 0),
            icon: Users,
            color: 'bg-green-500',
          },
          {
            label: 'Completed',
            value: events.reduce((sum, e) => sum + Number(e.completed_count), 0),
            icon: Check,
            color: 'bg-purple-500',
          },
        ].map((stat, idx) => (
          <div
            key={idx}
            className="bg-surface-light dark:bg-surface-dark rounded-xl p-4 border border-[#e5e5e0] dark:border-[#3e3d25]"
          >
            <div className="flex items-center gap-3">
              <div
                className={`w-10 h-10 rounded-lg ${stat.color} flex items-center justify-center`}
              >
                <stat.icon className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-xl font-bold text-[#181811] dark:text-white">{stat.value}</p>
                <p className="text-xs text-[#8c8b5f]">{stat.label}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-[#e5e5e0] dark:border-[#3e3d25]">
        {[
          { id: 'courses', label: 'Courses', icon: GraduationCap },
          { id: 'events', label: 'Events & Allocations', icon: Calendar },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-2 px-4 py-3 font-medium transition-colors border-b-2 -mb-px ${
              activeTab === tab.id
                ? 'border-primary text-primary'
                : 'border-transparent text-[#8c8b5f] hover:text-[#181811] dark:hover:text-white'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Search & Filter */}
      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8c8b5f]" />
          <input
            type="text"
            placeholder="Search courses or events..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-[#1a1909] border border-[#e5e5e0] dark:border-[#3e3d25] rounded-lg"
          />
        </div>
        {activeTab === 'courses' && (
          <>
            <div className="flex rounded-lg overflow-hidden border border-[#e5e5e0] dark:border-[#3e3d25]">
              {['all', 'live', 'test'].map(f => (
                <button
                  key={f}
                  onClick={() => setTestFilter(f as any)}
                  className={`px-4 py-2 text-sm font-medium capitalize ${
                    testFilter === f
                      ? 'bg-primary text-[#181811]'
                      : 'bg-white dark:bg-[#1a1909] text-[#8c8b5f] hover:bg-gray-100 dark:hover:bg-[#2e2d15]'
                  }`}
                >
                  {f === 'all' ? 'All' : f === 'test' ? '🧪 Test' : '✅ Live'}
                </button>
              ))}
            </div>
            <select
              value={categoryFilter}
              onChange={e => setCategoryFilter(e.target.value)}
              className="px-4 py-2.5 bg-white dark:bg-[#1a1909] border border-[#e5e5e0] dark:border-[#3e3d25] rounded-lg"
            >
              {categories.map(cat => (
                <option key={cat} value={cat}>
                  {cat === 'all' ? 'All Categories' : cat}
                </option>
              ))}
            </select>
          </>
        )}
      </div>

      {/* Content */}
      {activeTab === 'courses' && (
        <div className="grid grid-cols-3 gap-6">
          {filteredCourses.map(course => (
            <div
              key={course.id}
              className={`bg-surface-light dark:bg-surface-dark rounded-xl border overflow-hidden hover:shadow-lg transition-shadow ${
                course.is_test
                  ? 'border-amber-400 dark:border-amber-600 border-2'
                  : 'border-[#e5e5e0] dark:border-[#3e3d25]'
              }`}
            >
              <div
                className={`h-24 flex items-center justify-center text-4xl relative ${
                  course.is_test
                    ? 'bg-gradient-to-br from-amber-100 to-amber-50 dark:from-amber-900/30 dark:to-amber-800/10'
                    : 'bg-gradient-to-br from-primary/20 to-primary/5'
                }`}
              >
                <GraduationCap
                  className={`w-12 h-12 ${course.is_test ? 'text-amber-500/60' : 'text-primary/60'}`}
                />
                {course.is_test && (
                  <span className="absolute top-2 left-2 px-2 py-0.5 bg-amber-500 text-white text-xs font-bold rounded flex items-center gap-1">
                    🧪 TEST
                  </span>
                )}
                {!course.is_test && course.rl_eligible && (
                  <span className="absolute top-2 left-2 px-2 py-0.5 bg-green-500 text-white text-xs font-bold rounded flex items-center gap-1">
                    <Award className="w-3 h-3" /> RL
                  </span>
                )}
                {course.is_mandatory && (
                  <span className="absolute top-2 right-2 px-2 py-0.5 bg-red-500 text-white text-xs font-bold rounded">
                    MANDATORY
                  </span>
                )}
              </div>
              <div className="p-4">
                <div className="flex items-start justify-between mb-2">
                  {course.level && (
                    <span
                      className={`px-2 py-0.5 rounded text-xs font-medium ${LEVEL_STYLES[course.level].bg} ${LEVEL_STYLES[course.level].text}`}
                    >
                      {course.level}
                    </span>
                  )}
                  <span className="text-xs text-[#8c8b5f]">{course.code}</span>
                </div>
                <h3 className="font-bold text-[#181811] dark:text-white mb-1">{course.title}</h3>
                <p className="text-sm text-[#8c8b5f] mb-3">
                  {course.instructor || 'No instructor'}
                </p>
                <div className="flex items-center gap-4 text-xs text-[#8c8b5f] mb-4">
                  <div className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {course.duration_hours || '?'} hrs
                  </div>
                  <div className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {course.event_count} events
                  </div>
                  <div className="flex items-center gap-1">
                    <Users className="w-3 h-3" />
                    {course.total_allocations}
                  </div>
                </div>
                <button
                  onClick={() => {
                    setSelectedCourse(course);
                    setShowEventModal(true);
                  }}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-primary hover:bg-primary/90 text-[#181811] font-semibold rounded-lg transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Schedule Event
                </button>
              </div>
            </div>
          ))}
          {filteredCourses.length === 0 && (
            <div className="col-span-3 text-center py-12 text-[#8c8b5f]">
              No courses found. Run the migration to seed data.
            </div>
          )}
        </div>
      )}

      {activeTab === 'events' && (
        <div className="bg-surface-light dark:bg-surface-dark rounded-xl border border-[#e5e5e0] dark:border-[#3e3d25] overflow-hidden">
          <table className="w-full">
            <thead className="bg-[#f9f9f7] dark:bg-[#1a1909]">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-[#8c8b5f] uppercase">
                  Training
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-[#8c8b5f] uppercase">
                  Date
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-[#8c8b5f] uppercase">
                  Day Type
                </th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-[#8c8b5f] uppercase">
                  Allocated
                </th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-[#8c8b5f] uppercase">
                  Attended
                </th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-[#8c8b5f] uppercase">
                  Completed
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-[#8c8b5f] uppercase">
                  Status
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-[#8c8b5f] uppercase">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e5e5e0] dark:divide-[#3e3d25]">
              {filteredEvents.map(event => (
                <tr key={event.id} className="hover:bg-[#f9f9f7] dark:hover:bg-[#1a1909]">
                  <td className="px-4 py-3">
                    <div className="font-medium text-[#181811] dark:text-white">
                      {event.training_title}
                    </div>
                    <div className="text-xs text-[#8c8b5f]">{event.training_code}</div>
                  </td>
                  <td className="px-4 py-3 text-sm">{formatDate(event.event_date)}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`px-2 py-1 rounded text-xs font-medium ${DAY_TYPE_LABELS[event.day_type]?.color || 'bg-gray-100'}`}
                    >
                      {DAY_TYPE_LABELS[event.day_type]?.label || event.day_type}
                    </span>
                    {event.rl_eligible && (
                      <span className="ml-1 text-green-600 text-xs">
                        +{event.rl_credit_days || 1} RL
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center font-medium">{event.allocation_count}</td>
                  <td className="px-4 py-3 text-center font-medium text-blue-600">
                    {event.attended_count}
                  </td>
                  <td className="px-4 py-3 text-center font-medium text-green-600">
                    {event.completed_count}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`px-2 py-1 rounded text-xs font-medium ${STATUS_COLORS[event.status] || 'bg-gray-100'}`}
                    >
                      {event.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => {
                          setSelectedEvent(event);
                          setSelectedEmployees(new Set());
                          setShowAllocateModal(true);
                        }}
                        className="px-3 py-1.5 bg-blue-100 text-blue-700 rounded text-xs font-medium hover:bg-blue-200"
                      >
                        <Users className="w-3 h-3 inline mr-1" />
                        Allocate
                      </button>
                      <button
                        onClick={() => handleViewAllocations(event)}
                        className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded text-xs font-medium hover:bg-gray-200"
                      >
                        View
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredEvents.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-[#8c8b5f]">
                    No events scheduled. Select a course and click "Schedule Event".
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* ============================================================================
                MODALS
                ============================================================================ */}

      {/* Create Event Modal */}
      {showEventModal && selectedCourse && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-[#23220f] rounded-xl shadow-2xl w-full max-w-lg mx-4 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-[#181811] dark:text-white">
                Schedule Training Event
              </h2>
              <button
                onClick={() => setShowEventModal(false)}
                className="p-1 hover:bg-gray-100 dark:hover:bg-[#3e3d25] rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 bg-[#f9f9f7] dark:bg-[#1a1909] rounded-lg mb-4">
              <p className="font-semibold text-[#181811] dark:text-white">{selectedCourse.title}</p>
              <p className="text-sm text-[#8c8b5f]">
                {selectedCourse.code} • {selectedCourse.duration_hours || '?'} hours
              </p>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Start Date *</label>
                  <input
                    type="date"
                    value={eventForm.event_date}
                    onChange={e => setEventForm(f => ({ ...f, event_date: e.target.value }))}
                    className="w-full px-3 py-2 border border-[#e5e5e0] dark:border-[#3e3d25] rounded-lg bg-white dark:bg-[#1a1909]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">End Date</label>
                  <input
                    type="date"
                    value={eventForm.event_end_date}
                    onChange={e => setEventForm(f => ({ ...f, event_end_date: e.target.value }))}
                    className="w-full px-3 py-2 border border-[#e5e5e0] dark:border-[#3e3d25] rounded-lg bg-white dark:bg-[#1a1909]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Day Type *</label>
                <select
                  value={eventForm.day_type}
                  onChange={e => setEventForm(f => ({ ...f, day_type: e.target.value }))}
                  className="w-full px-3 py-2 border border-[#e5e5e0] dark:border-[#3e3d25] rounded-lg bg-white dark:bg-[#1a1909]"
                >
                  <option value="WORKING_DAY">Working Day (No RL)</option>
                  <option value="OFF_DAY">Off Day (RL Eligible)</option>
                  <option value="REST_DAY">Rest Day (RL Eligible)</option>
                  <option value="PUBLIC_HOLIDAY">Public Holiday (RL Eligible)</option>
                </select>
                {eventForm.day_type !== 'WORKING_DAY' && (
                  <p className="text-xs text-green-600 mt-1">
                    ✓ Workers will be eligible for Replacement Leave
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Location</label>
                <input
                  type="text"
                  value={eventForm.location}
                  onChange={e => setEventForm(f => ({ ...f, location: e.target.value }))}
                  placeholder="Training Room A, Conference Hall, etc."
                  className="w-full px-3 py-2 border border-[#e5e5e0] dark:border-[#3e3d25] rounded-lg bg-white dark:bg-[#1a1909]"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Location Type</label>
                <select
                  value={eventForm.location_type}
                  onChange={e => setEventForm(f => ({ ...f, location_type: e.target.value }))}
                  className="w-full px-3 py-2 border border-[#e5e5e0] dark:border-[#3e3d25] rounded-lg bg-white dark:bg-[#1a1909]"
                >
                  <option value="ONSITE">Onsite</option>
                  <option value="OFFSITE">Offsite</option>
                  <option value="ONLINE">Online</option>
                  <option value="HYBRID">Hybrid</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="rl_eligible"
                  checked={eventForm.rl_eligible}
                  onChange={e => setEventForm(f => ({ ...f, rl_eligible: e.target.checked }))}
                  className="rounded border-gray-300"
                />
                <label htmlFor="rl_eligible" className="text-sm">
                  Grant Replacement Leave for this event
                </label>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowEventModal(false)}
                className="flex-1 px-4 py-2.5 border border-[#e5e5e0] dark:border-[#3e3d25] rounded-lg font-medium hover:bg-gray-50 dark:hover:bg-[#2e2d15]"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateEvent}
                className="flex-1 px-4 py-2.5 bg-primary hover:bg-primary/90 text-[#181811] font-semibold rounded-lg"
              >
                Schedule Event
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Allocate Workers Modal */}
      {showAllocateModal && selectedEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-[#23220f] rounded-xl shadow-2xl w-full max-w-lg mx-4 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-[#181811] dark:text-white">Allocate Workers</h2>
              <button
                onClick={() => setShowAllocateModal(false)}
                className="p-1 hover:bg-gray-100 dark:hover:bg-[#3e3d25] rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 bg-[#f9f9f7] dark:bg-[#1a1909] rounded-lg mb-4">
              <p className="font-semibold text-[#181811] dark:text-white">
                {selectedEvent.training_title}
              </p>
              <p className="text-sm text-[#8c8b5f]">
                {formatDate(selectedEvent.event_date)} •{' '}
                {DAY_TYPE_LABELS[selectedEvent.day_type]?.label}
              </p>
            </div>

            <p className="text-sm font-medium text-[#181811] dark:text-white mb-3">
              Select Employees
            </p>
            <div className="space-y-2 max-h-60 overflow-y-auto border border-[#e5e5e0] dark:border-[#3e3d25] rounded-lg p-2">
              {employees.map(emp => (
                <label
                  key={emp.id}
                  className="flex items-center gap-3 p-2 rounded hover:bg-[#f9f9f7] dark:hover:bg-[#1a1909] cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={selectedEmployees.has(emp.id)}
                    onChange={() => {
                      const newSet = new Set(selectedEmployees);
                      if (newSet.has(emp.id)) {
                        newSet.delete(emp.id);
                      } else {
                        newSet.add(emp.id);
                      }
                      setSelectedEmployees(newSet);
                    }}
                    className="rounded border-gray-300 text-primary"
                  />
                  <div>
                    <p className="font-medium text-[#181811] dark:text-white">{emp.full_name}</p>
                    <p className="text-xs text-[#8c8b5f]">
                      {emp.employee_id} • {emp.department}
                    </p>
                  </div>
                </label>
              ))}
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowAllocateModal(false)}
                className="flex-1 px-4 py-2.5 border border-[#e5e5e0] dark:border-[#3e3d25] rounded-lg font-medium hover:bg-gray-50 dark:hover:bg-[#2e2d15]"
              >
                Cancel
              </button>
              <button
                onClick={handleAllocateWorkers}
                disabled={selectedEmployees.size === 0}
                className="flex-1 px-4 py-2.5 bg-primary hover:bg-primary/90 text-[#181811] font-semibold rounded-lg disabled:opacity-50"
              >
                Allocate ({selectedEmployees.size})
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Allocations Modal */}
      {showAllocationsModal && selectedEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-[#23220f] rounded-xl shadow-2xl w-full max-w-4xl mx-4 p-6 max-h-[80vh] overflow-auto">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-xl font-bold text-[#181811] dark:text-white">
                  Training Allocations
                </h2>
                <p className="text-sm text-[#8c8b5f]">
                  {selectedEvent.training_title} • {formatDate(selectedEvent.event_date)}
                </p>
              </div>
              <button
                onClick={() => setShowAllocationsModal(false)}
                className="p-1 hover:bg-gray-100 dark:hover:bg-[#3e3d25] rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {selectedEvent.rl_eligible && (
              <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg mb-4 flex items-center gap-2">
                <Award className="w-5 h-5 text-green-600" />
                <span className="text-sm text-green-700 dark:text-green-300">
                  This training grants <strong>{selectedEvent.rl_credit_days || 1} day(s)</strong>{' '}
                  Replacement Leave upon completion
                </span>
              </div>
            )}

            <table className="w-full">
              <thead className="bg-[#f9f9f7] dark:bg-[#1a1909]">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-[#8c8b5f]">
                    Employee
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-[#8c8b5f]">
                    Department
                  </th>
                  <th className="px-4 py-2 text-center text-xs font-semibold text-[#8c8b5f]">
                    Attendance
                  </th>
                  <th className="px-4 py-2 text-center text-xs font-semibold text-[#8c8b5f]">
                    Completion
                  </th>
                  <th className="px-4 py-2 text-center text-xs font-semibold text-[#8c8b5f]">
                    RL Credit
                  </th>
                  <th className="px-4 py-2 text-right text-xs font-semibold text-[#8c8b5f]">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e5e5e0] dark:divide-[#3e3d25]">
                {allocations.map(alloc => (
                  <tr key={alloc.id}>
                    <td className="px-4 py-3">
                      <div className="font-medium">{alloc.employee_name}</div>
                      <div className="text-xs text-[#8c8b5f]">{alloc.employee_code}</div>
                    </td>
                    <td className="px-4 py-3 text-sm">{alloc.department}</td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`px-2 py-1 rounded text-xs font-medium ${
                          alloc.attendance_status === 'ATTENDED'
                            ? 'bg-green-100 text-green-700'
                            : alloc.attendance_status === 'NO_SHOW'
                              ? 'bg-red-100 text-red-700'
                              : alloc.attendance_status === 'PARTIAL'
                                ? 'bg-amber-100 text-amber-700'
                                : 'bg-gray-100 text-gray-700'
                        }`}
                      >
                        {alloc.attendance_status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`px-2 py-1 rounded text-xs font-medium ${
                          alloc.completion_status === 'COMPLETED'
                            ? 'bg-green-100 text-green-700'
                            : alloc.completion_status === 'INCOMPLETE'
                              ? 'bg-red-100 text-red-700'
                              : 'bg-gray-100 text-gray-700'
                        }`}
                      >
                        {alloc.completion_status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {alloc.rl_credit_id ? (
                        <span className="text-green-600 font-medium">
                          +{alloc.rl_days_credited} day(s)
                        </span>
                      ) : alloc.rl_eligible ? (
                        <span className="text-gray-400 text-xs">Pending</span>
                      ) : (
                        <span className="text-gray-400 text-xs">N/A</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {alloc.attendance_status === 'PENDING' && (
                          <>
                            <button
                              onClick={() => handleMarkAttendance(alloc.id, 'ATTENDED')}
                              className="p-1.5 bg-green-100 text-green-700 rounded hover:bg-green-200"
                              title="Mark Attended"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleMarkAttendance(alloc.id, 'NO_SHOW')}
                              className="p-1.5 bg-red-100 text-red-700 rounded hover:bg-red-200"
                              title="Mark No-Show"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </>
                        )}
                        {alloc.attendance_status === 'ATTENDED' &&
                          alloc.completion_status === 'PENDING' && (
                            <>
                              <button
                                onClick={() => handleConfirmCompletion(alloc.id, 'COMPLETED')}
                                className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-medium hover:bg-green-200"
                              >
                                Confirm Complete
                              </button>
                              <button
                                onClick={() => handleConfirmCompletion(alloc.id, 'INCOMPLETE')}
                                className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs font-medium hover:bg-red-200"
                              >
                                Incomplete
                              </button>
                            </>
                          )}
                        {alloc.completion_status === 'COMPLETED' && !alloc.rl_credit_id && (
                          <span className="text-xs text-amber-600">RL pending...</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {allocations.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-[#8c8b5f]">
                      No workers allocated yet. Click "Allocate" to assign workers.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>

            <div className="flex justify-end mt-4">
              <button
                onClick={() => setShowAllocationsModal(false)}
                className="px-4 py-2 border border-[#e5e5e0] dark:border-[#3e3d25] rounded-lg font-medium hover:bg-gray-50 dark:hover:bg-[#2e2d15]"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Training Modal */}
      {showCreateModal && (
        <CreateTrainingModal
          onClose={() => setShowCreateModal(false)}
          onCreated={() => {
            setShowCreateModal(false);
            fetchData();
          }}
        />
      )}
    </div>
  );
};

// ============================================================================
// CREATE TRAINING MODAL COMPONENT
// ============================================================================

interface CreateTrainingModalProps {
  onClose: () => void;
  onCreated: () => void;
}

const CreateTrainingModal: React.FC<CreateTrainingModalProps> = ({ onClose, onCreated }) => {
  const [form, setForm] = useState({
    code: '',
    title: '',
    description: '',
    category: '',
    duration_hours: '',
    level: 'BEGINNER' as string,
    instructor: '',
    max_capacity: '',
    is_mandatory: false,
    rl_eligible: true,
    is_test: false,
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!form.code.trim() || !form.title.trim()) {
      alert('Code and Title are required');
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem('authToken');
      const res = await fetch('/api/training/courses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...form,
          duration_hours: form.duration_hours ? parseFloat(form.duration_hours) : undefined,
          max_capacity: form.max_capacity ? parseInt(form.max_capacity) : undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create training');

      alert(`✅ Training created${form.is_test ? ' (TEST)' : ''}!`);
      onCreated();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-[#23220f] rounded-xl shadow-2xl w-full max-w-lg mx-4 p-6 max-h-[90vh] overflow-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-[#181811] dark:text-white">Create Training</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 dark:hover:bg-[#3e3d25] rounded"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Test Training Toggle */}
        <div
          className={`p-3 rounded-lg mb-4 flex items-center justify-between ${
            form.is_test
              ? 'bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800'
              : 'bg-[#f9f9f7] dark:bg-[#1a1909] border border-[#e5e5e0] dark:border-[#3e3d25]'
          }`}
        >
          <div>
            <p className="font-medium text-[#181811] dark:text-white">
              {form.is_test ? '🧪 Test Training' : '✅ Live Training'}
            </p>
            <p className="text-xs text-[#8c8b5f]">
              {form.is_test
                ? 'This training is for testing only and will be clearly labeled'
                : 'This training will be available for production use'}
            </p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={form.is_test}
              onChange={e => setForm(f => ({ ...f, is_test: e.target.checked }))}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500"></div>
          </label>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Code *</label>
              <input
                type="text"
                value={form.code}
                onChange={e => setForm(f => ({ ...f, code: e.target.value.toUpperCase() }))}
                placeholder="TRN-001"
                className="w-full px-3 py-2 border border-[#e5e5e0] dark:border-[#3e3d25] rounded-lg bg-white dark:bg-[#1a1909]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Category</label>
              <input
                type="text"
                value={form.category}
                onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                placeholder="Safety, Compliance, etc."
                className="w-full px-3 py-2 border border-[#e5e5e0] dark:border-[#3e3d25] rounded-lg bg-white dark:bg-[#1a1909]"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Title *</label>
            <input
              type="text"
              value={form.title}
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              placeholder="Training title"
              className="w-full px-3 py-2 border border-[#e5e5e0] dark:border-[#3e3d25] rounded-lg bg-white dark:bg-[#1a1909]"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Description</label>
            <textarea
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              placeholder="Training description..."
              rows={2}
              className="w-full px-3 py-2 border border-[#e5e5e0] dark:border-[#3e3d25] rounded-lg bg-white dark:bg-[#1a1909]"
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Duration (hours)</label>
              <input
                type="number"
                value={form.duration_hours}
                onChange={e => setForm(f => ({ ...f, duration_hours: e.target.value }))}
                placeholder="8"
                className="w-full px-3 py-2 border border-[#e5e5e0] dark:border-[#3e3d25] rounded-lg bg-white dark:bg-[#1a1909]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Level</label>
              <select
                value={form.level}
                onChange={e => setForm(f => ({ ...f, level: e.target.value }))}
                className="w-full px-3 py-2 border border-[#e5e5e0] dark:border-[#3e3d25] rounded-lg bg-white dark:bg-[#1a1909]"
              >
                <option value="BEGINNER">Beginner</option>
                <option value="INTERMEDIATE">Intermediate</option>
                <option value="ADVANCED">Advanced</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Capacity</label>
              <input
                type="number"
                value={form.max_capacity}
                onChange={e => setForm(f => ({ ...f, max_capacity: e.target.value }))}
                placeholder="30"
                className="w-full px-3 py-2 border border-[#e5e5e0] dark:border-[#3e3d25] rounded-lg bg-white dark:bg-[#1a1909]"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Instructor</label>
            <input
              type="text"
              value={form.instructor}
              onChange={e => setForm(f => ({ ...f, instructor: e.target.value }))}
              placeholder="Instructor name"
              className="w-full px-3 py-2 border border-[#e5e5e0] dark:border-[#3e3d25] rounded-lg bg-white dark:bg-[#1a1909]"
            />
          </div>

          <div className="flex gap-6">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.rl_eligible}
                onChange={e => setForm(f => ({ ...f, rl_eligible: e.target.checked }))}
                className="rounded border-gray-300 text-primary"
              />
              <span className="text-sm">RL Eligible (grants Replacement Leave)</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.is_mandatory}
                onChange={e => setForm(f => ({ ...f, is_mandatory: e.target.checked }))}
                className="rounded border-gray-300 text-red-500"
              />
              <span className="text-sm">Mandatory</span>
            </label>
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 border border-[#e5e5e0] dark:border-[#3e3d25] rounded-lg font-medium hover:bg-gray-50 dark:hover:bg-[#2e2d15]"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className={`flex-1 px-4 py-2.5 font-semibold rounded-lg disabled:opacity-50 ${
              form.is_test
                ? 'bg-amber-500 hover:bg-amber-600 text-white'
                : 'bg-primary hover:bg-primary/90 text-[#181811]'
            }`}
          >
            {loading ? 'Creating...' : `Create${form.is_test ? ' Test' : ''} Training`}
          </button>
        </div>
      </div>
    </div>
  );
};

export default TrainingScreen;
