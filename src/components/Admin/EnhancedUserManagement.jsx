/**
 * ENHANCED USER MANAGEMENT - SAMIA TAROT
 * Complete user management with role-based permissions enforcement
 * Admin CANNOT delete users or create super admin accounts
 */

import React, { useState, useEffect, useContext } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  UserGroupIcon,
  PlusIcon,
  PencilIcon,
  EyeIcon,
  ShieldCheckIcon,
  ExclamationTriangleIcon,
  XMarkIcon,
  CheckIcon,
  UserIcon,
  KeyIcon,
  ClockIcon,
  CogIcon
} from '@heroicons/react/24/outline';
import { AuthContext } from '../../context/AuthContext';
import { useAPI } from '../../hooks/useAPI';
import { toast } from 'react-hot-toast';

const EnhancedUserManagement = () => {
  // Context and hooks
  const { user } = useContext(AuthContext);
  const { callAPI } = useAPI();

  // State management
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [showUserModal, setShowUserModal] = useState(false);
  const [modalMode, setModalMode] = useState('view'); // view, edit, create
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    role: 'client',
    is_active: true,
    phone: '',
    bio: '',
    specializations: [],
    languages: []
  });

  // Permissions state
  const [userPermissions, setUserPermissions] = useState({});

  // Available roles (Admin CANNOT create super_admin)
  const availableRoles = [
    { value: 'client', label: 'عميل (Client)', color: 'blue' },
    { value: 'reader', label: 'قارئ (Reader)', color: 'green' },
    { value: 'monitor', label: 'مراقب (Monitor)', color: 'yellow' },
    ...(user?.role === 'super_admin' ? [
      { value: 'admin', label: 'مدير (Admin)', color: 'purple' },
      { value: 'super_admin', label: 'مدير عام (Super Admin)', color: 'red' }
    ] : [
      { value: 'admin', label: 'مدير (Admin) - غير متاح', color: 'gray', disabled: true }
    ])
  ];

  // =====================================================
  // DATA LOADING
  // =====================================================

  useEffect(() => {
    loadUsers();
    loadUserPermissions();
  }, []);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const response = await callAPI('/admin/users', 'GET');
      if (response.success) {
        setUsers(response.data || []);
      }
    } catch (error) {
      toast.error('Failed to load users');
      console.error('Error loading users:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadUserPermissions = async () => {
    try {
      const response = await callAPI(`/flexible-tarot/permissions/${user?.role}`, 'GET');
      if (response.success) {
        const permissions = {};
        response.data.forEach(perm => {
          permissions[perm.permission_name] = perm.can_perform;
        });
        setUserPermissions(permissions);
      }
    } catch (error) {
      console.error('Error loading permissions:', error);
    }
  };

  // =====================================================
  // PERMISSION CHECKS
  // =====================================================

  const canEditUsers = () => {
    return userPermissions.edit_users === true;
  };

  const canDeleteUsers = () => {
    return userPermissions.delete_users === true;
  };

  const canCreateSuperAdmin = () => {
    return userPermissions.create_super_admin === true;
  };

  const canModifySuperAdmin = () => {
    return userPermissions.modify_super_admin === true;
  };

  // =====================================================
  // USER OPERATIONS
  // =====================================================

  const createUser = async () => {
    try {
      setLoading(true);

      // Validation
      if (!formData.name || !formData.email) {
        toast.error('Name and email are required');
        return;
      }

      // Permission check for super admin creation
      if (formData.role === 'super_admin' && !canCreateSuperAdmin()) {
        toast.error('You do not have permission to create super admin accounts');
        return;
      }

      const response = await callAPI('/admin/users', 'POST', formData);
      if (response.success) {
        toast.success('User created successfully');
        setShowUserModal(false);
        resetForm();
        loadUsers();
      }
    } catch (error) {
      toast.error('Failed to create user');
      console.error('Error creating user:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateUser = async () => {
    try {
      setLoading(true);

      // Permission check for super admin modification
      if (selectedUser?.role === 'super_admin' && !canModifySuperAdmin()) {
        toast.error('You do not have permission to modify super admin accounts');
        return;
      }

      // Permission check for role change to super admin
      if (formData.role === 'super_admin' && !canCreateSuperAdmin()) {
        toast.error('You do not have permission to assign super admin role');
        return;
      }

      const response = await callAPI(`/admin/users/${selectedUser.id}`, 'PUT', formData);
      if (response.success) {
        toast.success('User updated successfully');
        setShowUserModal(false);
        resetForm();
        loadUsers();
      }
    } catch (error) {
      toast.error('Failed to update user');
      console.error('Error updating user:', error);
    } finally {
      setLoading(false);
    }
  };

  const deleteUser = async (userId) => {
    if (!canDeleteUsers()) {
      toast.error('You do not have permission to delete users');
      return;
    }

    const userToDelete = users.find(u => u.id === userId);
    if (userToDelete?.role === 'super_admin' && !canModifySuperAdmin()) {
      toast.error('You cannot delete super admin accounts');
      return;
    }

    if (window.confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
      try {
        setLoading(true);
        const response = await callAPI(`/admin/users/${userId}`, 'DELETE');
        if (response.success) {
          toast.success('User deleted successfully');
          loadUsers();
        }
      } catch (error) {
        toast.error('Failed to delete user');
        console.error('Error deleting user:', error);
      } finally {
        setLoading(false);
      }
    }
  };

  // =====================================================
  // UTILITY FUNCTIONS
  // =====================================================

  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      role: 'client',
      is_active: true,
      phone: '',
      bio: '',
      specializations: [],
      languages: []
    });
    setSelectedUser(null);
  };

  const openModal = (mode, user = null) => {
    setModalMode(mode);
    setSelectedUser(user);
    
    if (user) {
      setFormData({
        name: user.name || '',
        email: user.email || '',
        role: user.role || 'client',
        is_active: user.is_active !== false,
        phone: user.phone || '',
        bio: user.bio || '',
        specializations: user.specializations || [],
        languages: user.languages || []
      });
    } else {
      resetForm();
    }
    
    setShowUserModal(true);
  };

  const getRoleColor = (role) => {
    const roleData = availableRoles.find(r => r.value === role);
    return roleData?.color || 'gray';
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.email?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = roleFilter === 'all' || user.role === roleFilter;
    const matchesStatus = statusFilter === 'all' || 
                         (statusFilter === 'active' && user.is_active) ||
                         (statusFilter === 'inactive' && !user.is_active);
    
    return matchesSearch && matchesRole && matchesStatus;
  });

  // =====================================================
  // RENDER COMPONENTS
  // =====================================================

  const UserModal = () => (
    <AnimatePresence>
      {showUserModal && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => setShowUserModal(false)}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-white">
                {modalMode === 'create' ? 'إنشاء مستخدم جديد' : 
                 modalMode === 'edit' ? 'تعديل المستخدم' : 'عرض المستخدم'}
              </h3>
              <button
                onClick={() => setShowUserModal(false)}
                className="text-cosmic-300 hover:text-white"
              >
                <XMarkIcon className="w-6 h-6" />
              </button>
            </div>

            {/* Permission Warning */}
            {modalMode !== 'view' && (
              <div className="mb-6 p-4 bg-yellow-600/20 border border-yellow-600/30 rounded-lg">
                <div className="flex items-start space-x-3 rtl:space-x-reverse">
                  <ExclamationTriangleIcon className="w-5 h-5 text-yellow-400 mt-0.5" />
                  <div className="text-sm text-yellow-200">
                    <p className="font-medium mb-1">تحذير الصلاحيات</p>
                    <ul className="space-y-1 text-xs">
                      {!canDeleteUsers() && (
                        <li>• لا يمكنك حذف المستخدمين (Super Admin only)</li>
                      )}
                      {!canCreateSuperAdmin() && (
                        <li>• لا يمكنك إنشاء أو تعديل حسابات المدير العام</li>
                      )}
                      <li>• يمكنك فقط عرض وتعديل بيانات المستخدمين العاديين</li>
                    </ul>
                  </div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Basic Information */}
              <div className="space-y-4">
                <h4 className="text-lg font-medium text-white border-b border-white/20 pb-2">
                  المعلومات الأساسية
                </h4>

                <div>
                  <label className="block text-sm font-medium text-cosmic-300 mb-2">
                    الاسم *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    disabled={modalMode === 'view'}
                    className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-cosmic-300 focus:border-purple-400 focus:outline-none disabled:opacity-50"
                    placeholder="اسم المستخدم"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-cosmic-300 mb-2">
                    البريد الإلكتروني *
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    disabled={modalMode === 'view'}
                    className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-cosmic-300 focus:border-purple-400 focus:outline-none disabled:opacity-50"
                    placeholder="email@example.com"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-cosmic-300 mb-2">
                    رقم الهاتف
                  </label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({...formData, phone: e.target.value})}
                    disabled={modalMode === 'view'}
                    className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-cosmic-300 focus:border-purple-400 focus:outline-none disabled:opacity-50"
                    placeholder="+1234567890"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-cosmic-300 mb-2">
                    النبذة الشخصية
                  </label>
                  <textarea
                    value={formData.bio}
                    onChange={(e) => setFormData({...formData, bio: e.target.value})}
                    disabled={modalMode === 'view'}
                    className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-cosmic-300 focus:border-purple-400 focus:outline-none disabled:opacity-50 resize-none"
                    rows={3}
                    placeholder="نبذة عن المستخدم..."
                  />
                </div>
              </div>

              {/* Role and Status */}
              <div className="space-y-4">
                <h4 className="text-lg font-medium text-white border-b border-white/20 pb-2">
                  الصلاحيات والحالة
                </h4>

                <div>
                  <label className="block text-sm font-medium text-cosmic-300 mb-2">
                    الدور *
                  </label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData({...formData, role: e.target.value})}
                    disabled={modalMode === 'view'}
                    className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:border-purple-400 focus:outline-none disabled:opacity-50"
                  >
                    {availableRoles.map((role) => (
                      <option 
                        key={role.value} 
                        value={role.value}
                        disabled={role.disabled}
                        className="bg-cosmic-800 text-white"
                      >
                        {role.label}
                      </option>
                    ))}
                  </select>
                  
                  {formData.role === 'super_admin' && !canCreateSuperAdmin() && (
                    <p className="text-red-400 text-xs mt-1">
                      ⚠️ ليس لديك صلاحية لإنشاء أو تعديل حسابات المدير العام
                    </p>
                  )}
                </div>

                <div className="flex items-center space-x-3 rtl:space-x-reverse">
                  <input
                    type="checkbox"
                    id="is_active"
                    checked={formData.is_active}
                    onChange={(e) => setFormData({...formData, is_active: e.target.checked})}
                    disabled={modalMode === 'view'}
                    className="w-4 h-4 text-purple-600 border-white/20 rounded focus:ring-purple-500"
                  />
                  <label htmlFor="is_active" className="text-sm text-cosmic-300">
                    حساب نشط
                  </label>
                </div>

                {/* Specializations for readers */}
                {formData.role === 'reader' && (
                  <div>
                    <label className="block text-sm font-medium text-cosmic-300 mb-2">
                      التخصصات
                    </label>
                    <input
                      type="text"
                      value={formData.specializations.join(', ')}
                      onChange={(e) => setFormData({
                        ...formData, 
                        specializations: e.target.value.split(',').map(s => s.trim()).filter(s => s)
                      })}
                      disabled={modalMode === 'view'}
                      className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-cosmic-300 focus:border-purple-400 focus:outline-none disabled:opacity-50"
                      placeholder="التاروت, الفنجان, الأبراج"
                    />
                  </div>
                )}

                {/* Languages */}
                <div>
                  <label className="block text-sm font-medium text-cosmic-300 mb-2">
                    اللغات
                  </label>
                  <input
                    type="text"
                    value={formData.languages.join(', ')}
                    onChange={(e) => setFormData({
                      ...formData, 
                      languages: e.target.value.split(',').map(s => s.trim()).filter(s => s)
                    })}
                    disabled={modalMode === 'view'}
                    className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-cosmic-300 focus:border-purple-400 focus:outline-none disabled:opacity-50"
                    placeholder="العربية, English, Français"
                  />
                </div>

                {/* User Stats (View mode only) */}
                {modalMode === 'view' && selectedUser && (
                  <div className="space-y-3">
                    <h5 className="text-sm font-medium text-cosmic-300">إحصائيات المستخدم</h5>
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div className="bg-white/5 p-2 rounded">
                        <p className="text-cosmic-400">تاريخ الإنشاء</p>
                        <p className="text-white">{new Date(selectedUser.created_at).toLocaleDateString('ar')}</p>
                      </div>
                      <div className="bg-white/5 p-2 rounded">
                        <p className="text-cosmic-400">آخر تحديث</p>
                        <p className="text-white">{new Date(selectedUser.updated_at).toLocaleDateString('ar')}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            {modalMode !== 'view' && (
              <div className="flex justify-end space-x-3 rtl:space-x-reverse mt-6 pt-6 border-t border-white/20">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setShowUserModal(false)}
                  className="px-4 py-2 bg-gray-600 text-white rounded-lg"
                >
                  إلغاء
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={modalMode === 'create' ? createUser : updateUser}
                  disabled={loading}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg disabled:opacity-50 flex items-center space-x-2 rtl:space-x-reverse"
                >
                  {loading && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                  <span>{modalMode === 'create' ? 'إنشاء' : 'حفظ'}</span>
                </motion.button>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  // =====================================================
  // MAIN RENDER
  // =====================================================

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center">
            <UserGroupIcon className="w-8 h-8 text-purple-400 mr-3" />
            إدارة المستخدمين
          </h2>
          <p className="text-cosmic-300 mt-1">
            عرض وتعديل بيانات المستخدمين (محدود الصلاحيات)
          </p>
        </div>
        
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => openModal('create')}
          className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center space-x-2 rtl:space-x-reverse"
        >
          <PlusIcon className="w-5 h-5" />
          <span>مستخدم جديد</span>
        </motion.button>
      </div>

      {/* Filters and Search */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div>
          <input
            type="text"
            placeholder="البحث..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-cosmic-300 focus:border-purple-400 focus:outline-none"
          />
        </div>
        
        <div>
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:border-purple-400 focus:outline-none"
          >
            <option value="all" className="bg-cosmic-800">جميع الأدوار</option>
            {availableRoles.map((role) => (
              <option key={role.value} value={role.value} className="bg-cosmic-800">
                {role.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:border-purple-400 focus:outline-none"
          >
            <option value="all" className="bg-cosmic-800">جميع الحالات</option>
            <option value="active" className="bg-cosmic-800">نشط</option>
            <option value="inactive" className="bg-cosmic-800">غير نشط</option>
          </select>
        </div>

        <div className="text-sm text-cosmic-300">
          إجمالي: {filteredUsers.length} مستخدم
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white/5 backdrop-blur-sm border border-white/20 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-white/10">
              <tr>
                <th className="px-6 py-3 text-right text-xs font-medium text-cosmic-300 uppercase tracking-wider">
                  المستخدم
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-cosmic-300 uppercase tracking-wider">
                  الدور
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-cosmic-300 uppercase tracking-wider">
                  الحالة
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-cosmic-300 uppercase tracking-wider">
                  تاريخ الإنشاء
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-cosmic-300 uppercase tracking-wider">
                  الإجراءات
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {filteredUsers.map((user) => (
                <motion.tr
                  key={user.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="hover:bg-white/5 transition-colors"
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="w-10 h-10 bg-gradient-to-br from-purple-600 to-blue-600 rounded-full flex items-center justify-center">
                        <UserIcon className="w-5 h-5 text-white" />
                      </div>
                      <div className="mr-4">
                        <div className="text-sm font-medium text-white">{user.name}</div>
                        <div className="text-sm text-cosmic-300">{user.email}</div>
                      </div>
                    </div>
                  </td>
                  
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-${getRoleColor(user.role)}-600/20 text-${getRoleColor(user.role)}-400`}>
                      <ShieldCheckIcon className="w-3 h-3 mr-1" />
                      {availableRoles.find(r => r.value === user.role)?.label || user.role}
                    </span>
                  </td>
                  
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      user.is_active 
                        ? 'bg-green-600/20 text-green-400' 
                        : 'bg-red-600/20 text-red-400'
                    }`}>
                      {user.is_active ? 'نشط' : 'غير نشط'}
                    </span>
                  </td>
                  
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-cosmic-300">
                    <div className="flex items-center">
                      <ClockIcon className="w-4 h-4 mr-1" />
                      {new Date(user.created_at).toLocaleDateString('ar')}
                    </div>
                  </td>
                  
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex items-center space-x-2 rtl:space-x-reverse">
                      <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => openModal('view', user)}
                        className="text-blue-400 hover:text-blue-300"
                        title="عرض"
                      >
                        <EyeIcon className="w-4 h-4" />
                      </motion.button>
                      
                      {canEditUsers() && (user.role !== 'super_admin' || canModifySuperAdmin()) && (
                        <motion.button
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          onClick={() => openModal('edit', user)}
                          className="text-yellow-400 hover:text-yellow-300"
                          title="تعديل"
                        >
                          <PencilIcon className="w-4 h-4" />
                        </motion.button>
                      )}
                      
                      {canDeleteUsers() && user.role !== 'super_admin' && (
                        <motion.button
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          onClick={() => deleteUser(user.id)}
                          className="text-red-400 hover:text-red-300"
                          title="حذف"
                        >
                          <XMarkIcon className="w-4 h-4" />
                        </motion.button>
                      )}
                    </div>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredUsers.length === 0 && (
          <div className="text-center py-12">
            <UserGroupIcon className="w-16 h-16 text-cosmic-300 mx-auto mb-4" />
            <p className="text-cosmic-300 text-lg">لا توجد مستخدمين</p>
          </div>
        )}
      </div>

      {/* Permission Notice */}
      <div className="bg-yellow-600/10 border border-yellow-600/20 rounded-lg p-4">
        <div className="flex items-start space-x-3 rtl:space-x-reverse">
          <ExclamationTriangleIcon className="w-5 h-5 text-yellow-400 mt-0.5" />
          <div className="text-sm text-yellow-200">
            <p className="font-medium mb-1">ملاحظة الصلاحيات</p>
            <p className="text-xs">
              كمدير، يمكنك عرض وتعديل بيانات المستخدمين العاديين فقط. 
              لا يمكنك حذف المستخدمين أو إنشاء حسابات مدير عام. 
              هذه الصلاحيات محفوظة للمدير العام فقط.
            </p>
          </div>
        </div>
      </div>

      {/* Modal */}
      <UserModal />
    </div>
  );
};

export default EnhancedUserManagement; 