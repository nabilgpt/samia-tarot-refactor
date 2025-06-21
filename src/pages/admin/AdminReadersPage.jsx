import React, { useState, useEffect } from 'react';
import { Eye, Search, Filter, Plus, Edit, Trash2, Star, Clock, DollarSign, Users } from 'lucide-react';
import AdminLayout from '../../components/Layout/AdminLayout';

const AdminReadersPage = () => {
  const [readers, setReaders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  useEffect(() => {
    fetchReaders();
  }, []);

  const fetchReaders = async () => {
    try {
      setLoading(true);
      // TODO: Replace with actual API call
      const response = await fetch('/api/admin/readers');
      if (response.ok) {
        const data = await response.json();
        setReaders(data);
      } else {
        // Mock data for now
        setReaders([
          {
            id: 1,
            name: 'سارة أحمد',
            email: 'sara@example.com',
            specialization: 'التاروت الكلاسيكي',
            rating: 4.8,
            totalSessions: 156,
            earnings: 2340,
            status: 'active',
            joinDate: '2023-12-01',
            lastActive: '2024-01-20'
          },
          {
            id: 2,
            name: 'محمد علي',
            email: 'mohamed@example.com',
            specialization: 'قراءة الطالع',
            rating: 4.6,
            totalSessions: 89,
            earnings: 1560,
            status: 'active',
            joinDate: '2024-01-05',
            lastActive: '2024-01-19'
          },
          {
            id: 3,
            name: 'نور فاطمة',
            email: 'nour@example.com',
            specialization: 'الأحلام والرؤى',
            rating: 4.9,
            totalSessions: 203,
            earnings: 3120,
            status: 'pending',
            joinDate: '2024-01-18',
            lastActive: '2024-01-20'
          }
        ]);
      }
    } catch (error) {
      console.error('Error fetching readers:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (readerId, newStatus) => {
    try {
      // TODO: Implement API call
      console.log(`Changing reader ${readerId} status to ${newStatus}`);
      setReaders(readers.map(reader => 
        reader.id === readerId ? { ...reader, status: newStatus } : reader
      ));
    } catch (error) {
      console.error('Error updating reader status:', error);
    }
  };

  const filteredReaders = readers.filter(reader => {
    const matchesSearch = reader.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         reader.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         reader.specialization.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' || reader.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  return (
    <AdminLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center">
              <Eye className="w-8 h-8 mr-3 text-purple-600" />
              إدارة القراء
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              إدارة القراء والموافقة على الطلبات ومراقبة الأداء
            </p>
          </div>
          <button className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg flex items-center">
            <Plus className="w-4 h-4 mr-2" />
            إضافة قارئ جديد
          </button>
        </div>

        {/* Search and Filters */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="البحث عن القراء..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-400" />
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
              >
                <option value="all">جميع الحالات</option>
                <option value="active">نشط</option>
                <option value="pending">في الانتظار</option>
                <option value="suspended">معلق</option>
                <option value="rejected">مرفوض</option>
              </select>
            </div>
          </div>
        </div>

        {/* Readers Table */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    القارئ
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    التخصص
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    التقييم
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    الجلسات
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    الأرباح
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    الحالة
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    الإجراءات
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {filteredReaders.map((reader) => (
                  <tr key={reader.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10">
                          <div className="h-10 w-10 rounded-full bg-purple-100 dark:bg-purple-900 flex items-center justify-center">
                            <span className="text-purple-600 dark:text-purple-300 font-medium">
                              {reader.name.charAt(0)}
                            </span>
                          </div>
                        </div>
                        <div className="mr-4">
                          <div className="text-sm font-medium text-gray-900 dark:text-white">
                            {reader.name}
                          </div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            {reader.email}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {reader.specialization}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <Star className="w-4 h-4 text-yellow-400 mr-1" />
                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                          {reader.rating}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {reader.totalSessions}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      ${reader.earnings}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <select
                        value={reader.status}
                        onChange={(e) => handleStatusChange(reader.id, e.target.value)}
                        className={`text-sm border rounded px-2 py-1 ${
                          reader.status === 'active'
                            ? 'bg-green-100 text-green-800 border-green-300 dark:bg-green-900 dark:text-green-300'
                            : reader.status === 'pending'
                            ? 'bg-yellow-100 text-yellow-800 border-yellow-300 dark:bg-yellow-900 dark:text-yellow-300'
                            : reader.status === 'suspended'
                            ? 'bg-red-100 text-red-800 border-red-300 dark:bg-red-900 dark:text-red-300'
                            : 'bg-gray-100 text-gray-800 border-gray-300 dark:bg-gray-900 dark:text-gray-300'
                        }`}
                      >
                        <option value="active">نشط</option>
                        <option value="pending">في الانتظار</option>
                        <option value="suspended">معلق</option>
                        <option value="rejected">مرفوض</option>
                      </select>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <button className="text-purple-600 hover:text-purple-900 dark:text-purple-400 dark:hover:text-purple-300">
                          <Edit className="w-4 h-4" />
                        </button>
                        <button className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
            <div className="flex items-center">
              <Eye className="w-8 h-8 text-blue-600" />
              <div className="mr-3">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">إجمالي القراء</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{readers.length}</p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
            <div className="flex items-center">
              <Users className="w-8 h-8 text-green-600" />
              <div className="mr-3">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">القراء النشطين</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {readers.filter(r => r.status === 'active').length}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
            <div className="flex items-center">
              <Clock className="w-8 h-8 text-yellow-600" />
              <div className="mr-3">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">في الانتظار</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {readers.filter(r => r.status === 'pending').length}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
            <div className="flex items-center">
              <DollarSign className="w-8 h-8 text-purple-600" />
              <div className="mr-3">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">إجمالي الأرباح</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  ${readers.reduce((sum, r) => sum + r.earnings, 0)}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminReadersPage; 