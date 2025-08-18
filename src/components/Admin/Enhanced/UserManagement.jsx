import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { 
  Users, 
  Search, 
  Filter, 
  Edit, 
  Ban, 
  CheckCircle, 
  XCircle,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Star,
  Eye,
  MoreHorizontal,
  UserPlus,
  Download,
  Shield
} from 'lucide-react';
import { useUI } from '../../../context/UIContext';
import api from '../../../services/frontendApi.js';

const UserManagement = () => {
  const { t } = useTranslation();
  const { language, showSuccess, showError } = useUI();
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRole, setSelectedRole] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [showFilters, setShowFilters] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        delayChildren: 0.1,
        staggerChildren: 0.05
      }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        type: "spring",
        stiffness: 100,
        damping: 12
      }
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  useEffect(() => {
    filterUsers();
  }, [users, searchTerm, selectedRole, selectedStatus]);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const response = await api.getAllUsers();
      if (response.success) {
        setUsers(response.data);
      } else {
        // Mock data for demonstration
        setUsers([
          {
            id: '1',
            first_name: 'Sarah',
            last_name: 'Ahmed',
            email: 'sarah@example.com',
            phone: '+1234567890',
            role: 'client',
            is_active: true,
            country: 'Egypt',
            created_at: '2024-01-15T10:30:00Z',
            last_login: '2024-01-20T14:22:00Z',
            bookings_count: 5,
            total_spent: 250
          },
          {
            id: '2',
            first_name: 'Mohamed',
            last_name: 'Ali',
            email: 'mohamed@example.com',
            phone: '+1234567891',
            role: 'reader',
            is_active: true,
            country: 'UAE',
            created_at: '2024-01-10T09:15:00Z',
            last_login: '2024-01-20T16:45:00Z',
            bookings_count: 32,
            rating: 4.8,
            specialties: ['Tarot', 'Palm Reading']
          },
          {
            id: '3',
            first_name: 'Fatima',
            last_name: 'Hassan',
            email: 'fatima@example.com',
            phone: '+1234567892',
            role: 'monitor',
            is_active: true,
            country: 'Lebanon',
            created_at: '2024-01-08T11:00:00Z',
            last_login: '2024-01-20T13:30:00Z'
          }
        ]);
      }
    } catch (error) {
      console.error('Error loading users:', error);
      showError(language === 'ar' ? 'فشل في تحميل المستخدمين' : 'Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const filterUsers = () => {
    let filtered = users;

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(user =>
        `${user.first_name} ${user.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.phone?.includes(searchTerm)
      );
    }

    // Role filter
    if (selectedRole !== 'all') {
      filtered = filtered.filter(user => user.role === selectedRole);
    }

    // Status filter
    if (selectedStatus !== 'all') {
      const isActive = selectedStatus === 'active';
      filtered = filtered.filter(user => user.is_active === isActive);
    }

    setFilteredUsers(filtered);
  };

  const handleUserEdit = (user) => {
    setEditingUser(user);
    setShowEditModal(true);
  };

  const handleUserStatusToggle = async (userId, currentStatus) => {
    try {
      const response = await api.updateUserStatus(userId, !currentStatus);
      if (response.success) {
        setUsers(users.map(user => 
          user.id === userId ? { ...user, is_active: !currentStatus } : user
        ));
        showSuccess(
          language === 'ar' 
            ? !currentStatus ? 'تم تفعيل المستخدم' : 'تم إلغاء تفعيل المستخدم'
            : !currentStatus ? 'User activated' : 'User deactivated'
        );
      }
    } catch (error) {
      showError(language === 'ar' ? 'فشل في تحديث حالة المستخدم' : 'Failed to update user status');
    }
  };

  const handleBulkAction = async (action) => {
    if (selectedUsers.length === 0) {
      showError(language === 'ar' ? 'يرجى اختيار مستخدم واحد على الأقل' : 'Please select at least one user');
      return;
    }

    try {
      let response;
      switch (action) {
        case 'activate':
          response = await api.bulkUpdateStatus(selectedUsers, true);
          break;
        case 'deactivate':
          response = await api.bulkUpdateStatus(selectedUsers, false);
          break;
        case 'export':
          exportUsers();
          return;
        default:
          return;
      }

      if (response?.success) {
        loadUsers();
        setSelectedUsers([]);
        showSuccess(language === 'ar' ? 'تم تنفيذ العملية بنجاح' : 'Operation completed successfully');
      }
    } catch (error) {
      showError(language === 'ar' ? 'فشل في تنفيذ العملية' : 'Operation failed');
    }
  };

  const exportUsers = () => {
    const csvContent = [
      ['Name', 'Email', 'Phone', 'Role', 'Status', 'Country', 'Joined'].join(','),
      ...filteredUsers.map(user => [
        `${user.first_name} ${user.last_name}`,
        user.email,
        user.phone || 'N/A',
        user.role,
        user.is_active ? 'Active' : 'Inactive',
        user.country || 'N/A',
        new Date(user.created_at).toLocaleDateString()
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `users-export-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const getRoleColor = (role) => {
    switch (role) {
      case 'super_admin': return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
      case 'admin': return 'bg-red-500/20 text-red-400 border-red-500/30';
      case 'reader': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'monitor': return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'client': return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
      default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  const getRoleLabel = (role) => {
    const labels = {
      super_admin: language === 'ar' ? 'مدير عام' : 'Super Admin',
      admin: language === 'ar' ? 'مدير' : 'Admin',
      reader: language === 'ar' ? 'قارئ' : 'Reader',
      monitor: language === 'ar' ? 'مراقب' : 'Monitor',
      client: language === 'ar' ? 'عميل' : 'Client'
    };
    return labels[role] || role;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gold-400"></div>
      </div>
    );
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      {/* Header */}
      <motion.div
        variants={itemVariants}
        className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4"
      >
        <div>
          <h2 className="text-3xl font-bold bg-gradient-to-r from-purple-400 via-pink-400 to-red-400 bg-clip-text text-transparent">
            {language === 'ar' ? 'إدارة المستخدمين' : 'User Management'}
          </h2>
          <p className="text-gray-400 mt-1">
            {language === 'ar' ? 'إدارة جميع المستخدمين والأدوار في النظام' : 'Manage all users and roles in the system'}
          </p>
        </div>
        
        <div className="flex items-center space-x-3">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => exportUsers()}
            className="flex items-center space-x-2 px-4 py-2 bg-green-500/20 text-green-400 border border-green-500/30 rounded-lg hover:bg-green-500/30 transition-colors"
          >
            <Download className="w-4 h-4" />
            <span>{language === 'ar' ? 'تصدير' : 'Export'}</span>
          </motion.button>
          
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="flex items-center space-x-2 px-4 py-2 bg-purple-500/20 text-purple-400 border border-purple-500/30 rounded-lg hover:bg-purple-500/30 transition-colors"
          >
            <UserPlus className="w-4 h-4" />
            <span>{language === 'ar' ? 'إضافة مستخدم' : 'Add User'}</span>
          </motion.button>
        </div>
      </motion.div>

      {/* Filters and Search */}
      <motion.div
        variants={itemVariants}
        className="glassmorphism rounded-2xl p-6 border border-white/10"
      >
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Search */}
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={language === 'ar' ? 'البحث بالاسم أو البريد الإلكتروني أو الهاتف...' : 'Search by name, email, or phone...'}
                className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-gold-400/50 transition-colors"
              />
            </div>
          </div>

          {/* Filters */}
          <div className="flex items-center space-x-4">
            <select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
              className="px-4 py-3 bg-white/5 border border-white/20 rounded-lg text-white focus:outline-none focus:border-gold-400/50 transition-colors"
            >
              <option value="all">{language === 'ar' ? 'كل الأدوار' : 'All Roles'}</option>
              <option value="super_admin">{language === 'ar' ? 'مدير عام' : 'Super Admin'}</option>
              <option value="admin">{language === 'ar' ? 'مدير' : 'Admin'}</option>
              <option value="reader">{language === 'ar' ? 'قارئ' : 'Reader'}</option>
              <option value="monitor">{language === 'ar' ? 'مراقب' : 'Monitor'}</option>
              <option value="client">{language === 'ar' ? 'عميل' : 'Client'}</option>
            </select>

            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="px-4 py-3 bg-white/5 border border-white/20 rounded-lg text-white focus:outline-none focus:border-gold-400/50 transition-colors"
            >
              <option value="all">{language === 'ar' ? 'كل الحالات' : 'All Status'}</option>
              <option value="active">{language === 'ar' ? 'نشط' : 'Active'}</option>
              <option value="inactive">{language === 'ar' ? 'غير نشط' : 'Inactive'}</option>
            </select>
          </div>
        </div>

        {/* Results Summary */}
        <div className="mt-4 flex items-center justify-between">
          <p className="text-gray-400 text-sm">
            {language === 'ar' 
              ? `عرض ${filteredUsers.length} من ${users.length} مستخدم`
              : `Showing ${filteredUsers.length} of ${users.length} users`
            }
          </p>

          {selectedUsers.length > 0 && (
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-400">
                {selectedUsers.length} {language === 'ar' ? 'محدد' : 'selected'}
              </span>
              <button
                onClick={() => handleBulkAction('activate')}
                className="px-3 py-1 text-xs bg-green-500/20 text-green-400 rounded-md hover:bg-green-500/30 transition-colors"
              >
                {language === 'ar' ? 'تفعيل' : 'Activate'}
              </button>
              <button
                onClick={() => handleBulkAction('deactivate')}
                className="px-3 py-1 text-xs bg-red-500/20 text-red-400 rounded-md hover:bg-red-500/30 transition-colors"
              >
                {language === 'ar' ? 'إلغاء تفعيل' : 'Deactivate'}
              </button>
            </div>
          )}
        </div>
      </motion.div>

      {/* Users Grid */}
      <motion.div
        variants={containerVariants}
        className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6"
      >
        {filteredUsers.map((user) => (
          <motion.div
            key={user.id}
            variants={itemVariants}
            whileHover={{ scale: 1.02, y: -5 }}
            className="glassmorphism rounded-2xl p-6 border border-white/10 hover:border-gold-400/30 transition-all duration-300 group"
          >
            {/* User Header */}
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  checked={selectedUsers.includes(user.id)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedUsers([...selectedUsers, user.id]);
                    } else {
                      setSelectedUsers(selectedUsers.filter(id => id !== user.id));
                    }
                  }}
                  className="w-4 h-4 text-gold-400 bg-white/10 border-white/20 rounded focus:ring-gold-400/50"
                />
                <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center">
                  <span className="text-white font-bold text-lg">
                    {user.first_name[0]}{user.last_name[0]}
                  </span>
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                <span className={`px-2 py-1 rounded-lg text-xs font-medium border ${getRoleColor(user.role)}`}>
                  {getRoleLabel(user.role)}
                </span>
                <div className="relative group">
                  <button className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors">
                    <MoreHorizontal className="w-4 h-4" />
                  </button>
                  
                  {/* Dropdown Menu */}
                  <div className="absolute right-0 top-full mt-2 w-48 bg-black/90 backdrop-blur-xl border border-white/20 rounded-lg shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-20">
                    <div className="p-2 space-y-1">
                      <button
                        onClick={() => handleUserEdit(user)}
                        className="w-full flex items-center space-x-2 px-3 py-2 text-sm text-gray-300 hover:bg-white/10 rounded-md transition-colors"
                      >
                        <Edit className="w-4 h-4" />
                        <span>{language === 'ar' ? 'تعديل' : 'Edit'}</span>
                      </button>
                      <button
                        onClick={() => handleUserStatusToggle(user.id, user.is_active)}
                        className="w-full flex items-center space-x-2 px-3 py-2 text-sm text-gray-300 hover:bg-white/10 rounded-md transition-colors"
                      >
                        {user.is_active ? <Ban className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
                        <span>{user.is_active ? (language === 'ar' ? 'إلغاء تفعيل' : 'Deactivate') : (language === 'ar' ? 'تفعيل' : 'Activate')}</span>
                      </button>
                      <button className="w-full flex items-center space-x-2 px-3 py-2 text-sm text-gray-300 hover:bg-white/10 rounded-md transition-colors">
                        <Eye className="w-4 h-4" />
                        <span>{language === 'ar' ? 'عرض التفاصيل' : 'View Details'}</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* User Info */}
            <div className="space-y-3">
              <div>
                <h3 className="text-lg font-semibold text-white group-hover:text-gold-300 transition-colors">
                  {user.first_name} {user.last_name}
                </h3>
                <div className="flex items-center space-x-2 mt-1">
                  <div className={`w-2 h-2 rounded-full ${user.is_active ? 'bg-green-400' : 'bg-red-400'}`}></div>
                  <span className={`text-sm ${user.is_active ? 'text-green-400' : 'text-red-400'}`}>
                    {user.is_active ? (language === 'ar' ? 'نشط' : 'Active') : (language === 'ar' ? 'غير نشط' : 'Inactive')}
                  </span>
                </div>
              </div>

              <div className="space-y-2 text-sm text-gray-400">
                <div className="flex items-center space-x-2">
                  <Mail className="w-4 h-4" />
                  <span>{user.email}</span>
                </div>
                {user.phone && (
                  <div className="flex items-center space-x-2">
                    <Phone className="w-4 h-4" />
                    <span>{user.phone}</span>
                  </div>
                )}
                {user.country && (
                  <div className="flex items-center space-x-2">
                    <MapPin className="w-4 h-4" />
                    <span>{user.country}</span>
                  </div>
                )}
                <div className="flex items-center space-x-2">
                  <Calendar className="w-4 h-4" />
                  <span>
                    {language === 'ar' ? 'انضم في' : 'Joined'} {new Date(user.created_at).toLocaleDateString()}
                  </span>
                </div>
              </div>

              {/* Role-specific Stats */}
              {user.role === 'reader' && (
                <div className="flex items-center justify-between pt-3 border-t border-white/10">
                  <div className="text-center">
                    <p className="text-lg font-semibold text-white">{user.bookings_count || 0}</p>
                    <p className="text-xs text-gray-400">{language === 'ar' ? 'حجز' : 'Bookings'}</p>
                  </div>
                  <div className="text-center">
                    <div className="flex items-center justify-center space-x-1">
                      <Star className="w-4 h-4 text-yellow-400 fill-current" />
                      <span className="text-lg font-semibold text-white">{user.rating || 'N/A'}</span>
                    </div>
                    <p className="text-xs text-gray-400">{language === 'ar' ? 'تقييم' : 'Rating'}</p>
                  </div>
                </div>
              )}

              {user.role === 'client' && user.total_spent && (
                <div className="pt-3 border-t border-white/10">
                  <div className="text-center">
                    <p className="text-lg font-semibold text-green-400">${user.total_spent}</p>
                    <p className="text-xs text-gray-400">{language === 'ar' ? 'إجمالي المبلغ' : 'Total Spent'}</p>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        ))}
      </motion.div>

      {/* Edit User Modal */}
      <AnimatePresence>
        {showEditModal && editingUser && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => setShowEditModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="glassmorphism rounded-2xl p-8 max-w-md w-full border border-white/20"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-2xl font-bold text-gold-300 mb-6">
                {language === 'ar' ? 'تعديل المستخدم' : 'Edit User'}
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    {language === 'ar' ? 'الاسم الأول' : 'First Name'}
                  </label>
                  <input
                    type="text"
                    defaultValue={editingUser.first_name}
                    className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-lg text-white focus:outline-none focus:border-gold-400/50 transition-colors"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    {language === 'ar' ? 'اسم العائلة' : 'Last Name'}
                  </label>
                  <input
                    type="text"
                    defaultValue={editingUser.last_name}
                    className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-lg text-white focus:outline-none focus:border-gold-400/50 transition-colors"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    {language === 'ar' ? 'الدور' : 'Role'}
                  </label>
                  <select
                    defaultValue={editingUser.role}
                    className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-lg text-white focus:outline-none focus:border-gold-400/50 transition-colors"
                  >
                    <option value="client">{language === 'ar' ? 'عميل' : 'Client'}</option>
                    <option value="reader">{language === 'ar' ? 'قارئ' : 'Reader'}</option>
                    <option value="monitor">{language === 'ar' ? 'مراقب' : 'Monitor'}</option>
                    <option value="admin">{language === 'ar' ? 'مدير' : 'Admin'}</option>
                  </select>
                </div>
              </div>
              
              <div className="flex items-center justify-end space-x-4 mt-8">
                <button
                  onClick={() => setShowEditModal(false)}
                  className="px-6 py-2 text-gray-400 hover:text-white transition-colors"
                >
                  {language === 'ar' ? 'إلغاء' : 'Cancel'}
                </button>
                <button className="px-6 py-2 bg-gradient-to-r from-gold-500 to-gold-600 text-gray-900 font-medium rounded-lg hover:from-gold-600 hover:to-gold-700 transition-colors">
                  {language === 'ar' ? 'حفظ' : 'Save'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default UserManagement; 