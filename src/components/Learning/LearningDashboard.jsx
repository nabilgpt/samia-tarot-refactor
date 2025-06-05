import React, { useState, useEffect } from 'react';
import { 
  BookOpen, Play, Users, Award, Clock, Star,
  Plus, Edit, Trash2, Eye, Download, Upload,
  BarChart3, TrendingUp, Calendar, Filter
} from 'lucide-react';
import { supabase } from '../../lib/supabase.js';
import { useAuth } from '../../context/AuthContext.jsx';

const LearningDashboard = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  const [courses, setCourses] = useState([]);
  const [enrollments, setEnrollments] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [showCreateCourse, setShowCreateCourse] = useState(false);

  useEffect(() => {
    if (user?.id) {
      loadLearningData();
    }
  }, [user?.id]);

  const loadLearningData = async () => {
    setLoading(true);
    try {
      const [coursesResult, enrollmentsResult, statsResult] = await Promise.all([
        loadCourses(),
        loadEnrollments(),
        loadStats()
      ]);
    } catch (error) {
      console.error('Error loading learning data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadCourses = async () => {
    try {
      const { data, error } = await supabase
        .from('courses')
        .select(`
          *,
          instructor:instructor_id(full_name, avatar_url)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCourses(data || []);
      return data;
    } catch (error) {
      console.error('Error loading courses:', error);
      return [];
    }
  };

  const loadEnrollments = async () => {
    try {
      const { data, error } = await supabase
        .from('course_enrollments')
        .select(`
          *,
          course:course_id(*),
          student:student_id(full_name, avatar_url)
        `)
        .eq('student_id', user.id)
        .order('enrolled_at', { ascending: false });

      if (error) throw error;
      setEnrollments(data || []);
      return data;
    } catch (error) {
      console.error('Error loading enrollments:', error);
      return [];
    }
  };

  const loadStats = async () => {
    try {
      // Get course statistics
      const { data: courseStats, error: courseError } = await supabase
        .from('courses')
        .select('id, enrollment_count, average_rating')
        .eq('instructor_id', user.id);

      if (courseError) throw courseError;

      // Get enrollment statistics
      const { data: enrollmentStats, error: enrollmentError } = await supabase
        .from('course_enrollments')
        .select('progress_percentage, status')
        .eq('student_id', user.id);

      if (enrollmentError) throw enrollmentError;

      const stats = {
        totalCourses: courseStats?.length || 0,
        totalEnrollments: courseStats?.reduce((sum, course) => sum + (course.enrollment_count || 0), 0) || 0,
        averageRating: courseStats?.reduce((sum, course) => sum + (course.average_rating || 0), 0) / (courseStats?.length || 1) || 0,
        completedCourses: enrollmentStats?.filter(e => e.status === 'completed').length || 0,
        inProgressCourses: enrollmentStats?.filter(e => e.status === 'active').length || 0,
        averageProgress: enrollmentStats?.reduce((sum, e) => sum + (e.progress_percentage || 0), 0) / (enrollmentStats?.length || 1) || 0
      };

      setStats(stats);
      return stats;
    } catch (error) {
      console.error('Error loading stats:', error);
      return {};
    }
  };

  const tabs = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'courses', label: 'My Courses', icon: BookOpen },
    { id: 'create', label: 'Create Course', icon: Plus },
    { id: 'students', label: 'Students', icon: Users },
    { id: 'analytics', label: 'Analytics', icon: TrendingUp }
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Learning Management</h1>
              <p className="text-gray-600 mt-1">Manage courses and track learning progress</p>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setShowCreateCourse(true)}
                className="flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
              >
                <Plus className="w-4 h-4 mr-2" />
                Create Course
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6">
          <nav className="flex space-x-8">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center py-4 px-1 border-b-2 font-medium text-sm ${
                    activeTab === tab.id
                      ? 'border-purple-500 text-purple-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Icon className="w-4 h-4 mr-2" />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {activeTab === 'overview' && (
          <OverviewTab 
            stats={stats}
            courses={courses}
            enrollments={enrollments}
          />
        )}

        {activeTab === 'courses' && (
          <CoursesTab 
            courses={courses}
            onUpdate={loadLearningData}
          />
        )}

        {activeTab === 'create' && (
          <CreateCourseTab 
            onCourseCreated={loadLearningData}
          />
        )}

        {activeTab === 'students' && (
          <StudentsTab 
            enrollments={enrollments}
          />
        )}

        {activeTab === 'analytics' && (
          <AnalyticsTab 
            stats={stats}
            courses={courses}
          />
        )}
      </div>
    </div>
  );
};

// Overview Tab Component
const OverviewTab = ({ stats, courses, enrollments }) => (
  <div className="space-y-8">
    {/* Key Metrics */}
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <MetricCard
        title="Total Courses"
        value={stats.totalCourses}
        icon={BookOpen}
        color="blue"
      />
      <MetricCard
        title="Total Students"
        value={stats.totalEnrollments}
        icon={Users}
        color="green"
      />
      <MetricCard
        title="Average Rating"
        value={`${stats.averageRating.toFixed(1)}/5`}
        icon={Star}
        color="yellow"
      />
      <MetricCard
        title="Completion Rate"
        value={`${((stats.completedCourses / (stats.completedCourses + stats.inProgressCourses)) * 100 || 0).toFixed(1)}%`}
        icon={Award}
        color="purple"
      />
    </div>

    {/* Recent Activity */}
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      {/* Popular Courses */}
      <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Popular Courses</h3>
        <div className="space-y-3">
          {courses.slice(0, 5).map((course) => (
            <div key={course.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center">
                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                  <BookOpen className="w-5 h-5 text-purple-600" />
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-900">{course.title}</p>
                  <p className="text-xs text-gray-500">{course.enrollment_count} students</p>
                </div>
              </div>
              <div className="flex items-center">
                <Star className="w-4 h-4 text-yellow-400 mr-1" />
                <span className="text-sm font-medium">{course.average_rating || 0}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Enrollments */}
      <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Enrollments</h3>
        <div className="space-y-3">
          {enrollments.slice(0, 5).map((enrollment) => (
            <div key={enrollment.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                  <Users className="w-4 h-4 text-blue-600" />
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-900">
                    {enrollment.course?.title}
                  </p>
                  <p className="text-xs text-gray-500">
                    {new Date(enrollment.enrolled_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm font-medium text-gray-900">
                  {enrollment.progress_percentage}%
                </div>
                <div className="w-16 bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-purple-600 h-2 rounded-full" 
                    style={{ width: `${enrollment.progress_percentage}%` }}
                  ></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  </div>
);

// Metric Card Component
const MetricCard = ({ title, value, icon: Icon, color }) => {
  const colorClasses = {
    blue: 'bg-blue-100 text-blue-600',
    green: 'bg-green-100 text-green-600',
    yellow: 'bg-yellow-100 text-yellow-600',
    purple: 'bg-purple-100 text-purple-600'
  };

  return (
    <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
        </div>
        <div className={`p-3 rounded-full ${colorClasses[color]}`}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
    </div>
  );
};

// Courses Tab Component
const CoursesTab = ({ courses, onUpdate }) => (
  <div className="space-y-6">
    <div className="flex justify-between items-center">
      <h3 className="text-lg font-semibold text-gray-900">My Courses</h3>
      <div className="flex items-center space-x-4">
        <button className="flex items-center px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
          <Filter className="w-4 h-4 mr-2" />
          Filter
        </button>
      </div>
    </div>

    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {courses.map((course) => (
        <CourseCard key={course.id} course={course} onUpdate={onUpdate} />
      ))}
    </div>
  </div>
);

// Course Card Component
const CourseCard = ({ course, onUpdate }) => (
  <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
    {course.thumbnail_url && (
      <img 
        src={course.thumbnail_url} 
        alt={course.title}
        className="w-full h-48 object-cover"
      />
    )}
    <div className="p-6">
      <div className="flex items-center justify-between mb-2">
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
          course.status === 'published' ? 'bg-green-100 text-green-800' :
          course.status === 'draft' ? 'bg-yellow-100 text-yellow-800' :
          'bg-gray-100 text-gray-800'
        }`}>
          {course.status}
        </span>
        <div className="flex items-center">
          <Star className="w-4 h-4 text-yellow-400 mr-1" />
          <span className="text-sm">{course.average_rating || 0}</span>
        </div>
      </div>
      
      <h4 className="font-semibold text-gray-900 mb-2">{course.title}</h4>
      <p className="text-sm text-gray-600 mb-4 line-clamp-2">{course.short_description}</p>
      
      <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
        <div className="flex items-center">
          <Clock className="w-4 h-4 mr-1" />
          {course.total_duration_minutes} min
        </div>
        <div className="flex items-center">
          <Users className="w-4 h-4 mr-1" />
          {course.enrollment_count} students
        </div>
      </div>
      
      <div className="flex items-center space-x-2">
        <button className="flex-1 flex items-center justify-center px-3 py-2 text-sm font-medium text-purple-600 border border-purple-600 rounded-lg hover:bg-purple-50">
          <Eye className="w-4 h-4 mr-1" />
          View
        </button>
        <button className="flex items-center justify-center px-3 py-2 text-sm font-medium text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50">
          <Edit className="w-4 h-4" />
        </button>
      </div>
    </div>
  </div>
);

// Create Course Tab Component
const CreateCourseTab = ({ onCourseCreated }) => {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    short_description: '',
    price: 0,
    difficulty_level: 'beginner',
    category: '',
    total_duration_minutes: 0
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data, error } = await supabase
        .from('courses')
        .insert({
          instructor_id: user.id,
          ...formData,
          course_content: [],
          status: 'draft'
        })
        .select()
        .single();

      if (error) throw error;

      alert('Course created successfully!');
      setFormData({
        title: '',
        description: '',
        short_description: '',
        price: 0,
        difficulty_level: 'beginner',
        category: '',
        total_duration_minutes: 0
      });
      onCourseCreated();
    } catch (error) {
      console.error('Error creating course:', error);
      alert('Error creating course');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-6">Create New Course</h3>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Course Title *
            </label>
            <input
              type="text"
              required
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
              placeholder="Enter course title"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Short Description
            </label>
            <input
              type="text"
              value={formData.short_description}
              onChange={(e) => setFormData(prev => ({ ...prev, short_description: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
              placeholder="Brief description for course cards"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Full Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
              rows="4"
              placeholder="Detailed course description"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Price ($)
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={formData.price}
                onChange={(e) => setFormData(prev => ({ ...prev, price: parseFloat(e.target.value) }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Duration (minutes)
              </label>
              <input
                type="number"
                min="0"
                value={formData.total_duration_minutes}
                onChange={(e) => setFormData(prev => ({ ...prev, total_duration_minutes: parseInt(e.target.value) }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Difficulty Level
              </label>
              <select
                value={formData.difficulty_level}
                onChange={(e) => setFormData(prev => ({ ...prev, difficulty_level: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
              >
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Category
              </label>
              <input
                type="text"
                value={formData.category}
                onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                placeholder="e.g., Tarot Basics, Advanced Readings"
              />
            </div>
          </div>

          <div className="flex justify-end space-x-3">
            <button
              type="button"
              className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Save as Draft
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
            >
              {loading ? 'Creating...' : 'Create Course'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Students Tab Component
const StudentsTab = ({ enrollments }) => (
  <div className="space-y-6">
    <h3 className="text-lg font-semibold text-gray-900">Student Progress</h3>
    
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Student
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Course
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Progress
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Enrolled
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {enrollments.map((enrollment) => (
              <tr key={enrollment.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                      <Users className="w-4 h-4 text-purple-600" />
                    </div>
                    <div className="ml-3">
                      <div className="text-sm font-medium text-gray-900">
                        {enrollment.student?.full_name || 'Anonymous'}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {enrollment.course?.title}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className="w-16 bg-gray-200 rounded-full h-2 mr-2">
                      <div 
                        className="bg-purple-600 h-2 rounded-full" 
                        style={{ width: `${enrollment.progress_percentage}%` }}
                      ></div>
                    </div>
                    <span className="text-sm text-gray-900">{enrollment.progress_percentage}%</span>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    enrollment.status === 'completed' ? 'bg-green-100 text-green-800' :
                    enrollment.status === 'active' ? 'bg-blue-100 text-blue-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {enrollment.status}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {new Date(enrollment.enrolled_at).toLocaleDateString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  </div>
);

// Analytics Tab Component
const AnalyticsTab = ({ stats, courses }) => (
  <div className="space-y-8">
    <h3 className="text-lg font-semibold text-gray-900">Learning Analytics</h3>
    
    {/* Course Performance */}
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
        <h4 className="text-lg font-semibold text-gray-900 mb-4">Course Performance</h4>
        <div className="space-y-4">
          {courses.slice(0, 5).map((course) => (
            <div key={course.id} className="flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-900">{course.title}</p>
                <p className="text-sm text-gray-500">{course.enrollment_count} students</p>
              </div>
              <div className="text-right">
                <div className="flex items-center">
                  <Star className="w-4 h-4 text-yellow-400 mr-1" />
                  <span className="font-medium">{course.average_rating || 0}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
        <h4 className="text-lg font-semibold text-gray-900 mb-4">Revenue Analytics</h4>
        <div className="space-y-4">
          <div className="flex justify-between">
            <span className="text-gray-600">Total Revenue</span>
            <span className="font-semibold">
              ${courses.reduce((sum, course) => sum + (course.price * course.enrollment_count), 0).toFixed(2)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Average Course Price</span>
            <span className="font-semibold">
              ${(courses.reduce((sum, course) => sum + course.price, 0) / courses.length || 0).toFixed(2)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Completion Rate</span>
            <span className="font-semibold">
              {((stats.completedCourses / (stats.completedCourses + stats.inProgressCourses)) * 100 || 0).toFixed(1)}%
            </span>
          </div>
        </div>
      </div>
    </div>
  </div>
);

export default LearningDashboard; 