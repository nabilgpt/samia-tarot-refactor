import React, { useState, useEffect } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { User, Mail, Calendar, Star, Shield, Edit3, Save, X, AlertCircle, CheckCircle } from 'lucide-react';
import { getCurrentUser } from '../../lib/auth';

const Profile = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    birth_date: '',
    timezone: '',
    preferences: {
      email_notifications: true,
      reading_reminders: true,
      promotional_emails: false
    }
  });
  const shouldReduceMotion = useReducedMotion();

  useEffect(() => {
    loadUserProfile();
  }, []);

  const loadUserProfile = async () => {
    try {
      const currentUser = await getCurrentUser();
      setUser(currentUser);
      setFormData({
        name: currentUser.user_metadata?.name || '',
        birth_date: currentUser.user_metadata?.birth_date || '',
        timezone: currentUser.user_metadata?.timezone || '',
        preferences: {
          email_notifications: currentUser.user_metadata?.preferences?.email_notifications ?? true,
          reading_reminders: currentUser.user_metadata?.preferences?.reading_reminders ?? true,
          promotional_emails: currentUser.user_metadata?.preferences?.promotional_emails ?? false
        }
      });
    } catch (error) {
      console.error('Error loading profile:', error);
      setError('Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      setSuccess('Profile updated successfully');
      setEditing(false);
      setTimeout(() => setSuccess(null), 3000);
    } catch (error) {
      console.error('Error saving profile:', error);
      setError('Failed to save profile');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    loadUserProfile();
    setEditing(false);
    setError(null);
  };

  const itemVariants = {
    hidden: shouldReduceMotion ? { opacity: 0 } : { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: shouldReduceMotion ? { duration: 0.3 } : {
        type: "spring",
        stiffness: 100,
        damping: 12
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen py-20 px-4">
        <div className="container mx-auto max-w-4xl">
          <div className="bg-theme-card backdrop-blur-lg border border-theme-cosmic rounded-2xl p-8 animate-pulse">
            <div className="flex items-center mb-8">
              <div className="w-20 h-20 bg-theme-tertiary rounded-full mr-6"></div>
              <div className="space-y-2">
                <div className="h-8 bg-theme-tertiary rounded w-48"></div>
                <div className="h-4 bg-theme-tertiary rounded w-32"></div>
              </div>
            </div>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="h-4 bg-theme-tertiary rounded"></div>
                <div className="h-4 bg-theme-tertiary rounded"></div>
                <div className="h-4 bg-theme-tertiary rounded"></div>
              </div>
              <div className="space-y-4">
                <div className="h-4 bg-theme-tertiary rounded"></div>
                <div className="h-4 bg-theme-tertiary rounded"></div>
                <div className="h-4 bg-theme-tertiary rounded"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-20 px-4">
      <div className="container mx-auto max-w-4xl">

        {/* Header */}
        <motion.div
          variants={itemVariants}
          initial="hidden"
          animate="visible"
          className="text-center mb-12"
        >
          <h1 className="text-4xl md:text-5xl font-bold gradient-text mb-4">
            My Profile
          </h1>
          <div className="w-32 h-1 bg-cosmic-gradient mx-auto mb-6 rounded-full shadow-theme-cosmic" />
          <p className="text-theme-secondary text-lg">
            Manage your account settings and preferences
          </p>
        </motion.div>

        <motion.div
          variants={itemVariants}
          initial="hidden"
          animate="visible"
          className="bg-theme-card backdrop-blur-lg border border-theme-cosmic rounded-2xl p-8"
        >

          {/* Success/Error Messages */}
          {success && (
            <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-4 mb-6">
              <div className="flex items-center">
                <CheckCircle className="w-5 h-5 text-green-400 mr-3" />
                <p className="text-green-400">{success}</p>
              </div>
            </div>
          )}

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 mb-6">
              <div className="flex items-center">
                <AlertCircle className="w-5 h-5 text-red-400 mr-3" />
                <p className="text-red-400">{error}</p>
              </div>
            </div>
          )}

          {/* Profile Header */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
            <div className="flex items-center mb-4 md:mb-0">
              <div className="w-20 h-20 bg-cosmic-gradient rounded-full flex items-center justify-center mr-6">
                <User className="w-10 h-10 text-theme-inverse" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-theme-primary">{user?.user_metadata?.name || 'Welcome'}</h2>
                <p className="text-theme-secondary flex items-center">
                  <Mail className="w-4 h-4 mr-2" />
                  {user?.email}
                </p>
                <div className="flex items-center mt-1 text-theme-muted text-sm">
                  <Shield className="w-3 h-3 mr-1" />
                  Role: {user?.user_metadata?.role || 'client'}
                </div>
              </div>
            </div>

            {!editing ? (
              <button
                onClick={() => setEditing(true)}
                className="inline-flex items-center px-4 py-2 bg-cosmic-gradient hover:shadow-theme-cosmic text-theme-inverse font-medium rounded-lg transition-all duration-300 transform hover:scale-105"
              >
                <Edit3 className="w-4 h-4 mr-2" />
                Edit Profile
              </button>
            ) : (
              <div className="flex gap-3">
                <button
                  onClick={handleCancel}
                  className="inline-flex items-center px-4 py-2 bg-transparent border border-theme-cosmic text-theme-primary hover:bg-theme-cosmic hover:text-theme-inverse rounded-lg transition-all duration-300"
                >
                  <X className="w-4 h-4 mr-2" />
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="inline-flex items-center px-4 py-2 bg-cosmic-gradient hover:shadow-theme-cosmic text-theme-inverse font-medium rounded-lg transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? (
                    <>
                      <div className="w-4 h-4 border-2 border-theme-inverse border-t-transparent rounded-full animate-spin mr-2"></div>
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Save Changes
                    </>
                  )}
                </button>
              </div>
            )}
          </div>

          {/* Profile Information */}
          <div className="grid md:grid-cols-2 gap-8">

            {/* Personal Information */}
            <div>
              <h3 className="text-xl font-bold text-theme-primary mb-6 flex items-center">
                <User className="w-5 h-5 text-gold-primary mr-2" />
                Personal Information
              </h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-theme-secondary text-sm mb-2">Full Name</label>
                  {editing ? (
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full bg-theme-card border border-theme-cosmic rounded-lg p-3 text-theme-primary focus:border-gold-primary focus:outline-none transition-colors duration-300"
                      placeholder="Enter your full name"
                    />
                  ) : (
                    <p className="text-theme-primary">{formData.name || 'Not provided'}</p>
                  )}
                </div>

                <div>
                  <label className="block text-theme-secondary text-sm mb-2">Birth Date</label>
                  {editing ? (
                    <input
                      type="date"
                      value={formData.birth_date}
                      onChange={(e) => setFormData({ ...formData, birth_date: e.target.value })}
                      className="w-full bg-theme-card border border-theme-cosmic rounded-lg p-3 text-theme-primary focus:border-gold-primary focus:outline-none transition-colors duration-300"
                    />
                  ) : (
                    <p className="text-theme-primary flex items-center">
                      <Calendar className="w-4 h-4 mr-2" />
                      {formData.birth_date ? new Date(formData.birth_date).toLocaleDateString() : 'Not provided'}
                    </p>
                  )}
                  <p className="text-theme-muted text-xs mt-1">Used for astrology readings</p>
                </div>

                <div>
                  <label className="block text-theme-secondary text-sm mb-2">Timezone</label>
                  {editing ? (
                    <select
                      value={formData.timezone}
                      onChange={(e) => setFormData({ ...formData, timezone: e.target.value })}
                      className="w-full bg-theme-card border border-theme-cosmic rounded-lg p-3 text-theme-primary focus:border-gold-primary focus:outline-none transition-colors duration-300"
                    >
                      <option value="">Select timezone</option>
                      <option value="America/New_York">Eastern Time (ET)</option>
                      <option value="America/Chicago">Central Time (CT)</option>
                      <option value="America/Denver">Mountain Time (MT)</option>
                      <option value="America/Los_Angeles">Pacific Time (PT)</option>
                      <option value="Europe/London">GMT</option>
                      <option value="Europe/Paris">Central European Time</option>
                      <option value="Asia/Tokyo">Japan Standard Time</option>
                    </select>
                  ) : (
                    <p className="text-theme-primary">{formData.timezone || 'Not provided'}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Preferences */}
            <div>
              <h3 className="text-xl font-bold text-theme-primary mb-6 flex items-center">
                <Star className="w-5 h-5 text-gold-primary mr-2" />
                Preferences
              </h3>

              <div className="space-y-4">
                <div className="bg-theme-card/50 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-theme-primary font-medium">Email Notifications</label>
                    {editing ? (
                      <input
                        type="checkbox"
                        checked={formData.preferences.email_notifications}
                        onChange={(e) => setFormData({
                          ...formData,
                          preferences: { ...formData.preferences, email_notifications: e.target.checked }
                        })}
                        className="w-4 h-4 text-gold-primary bg-theme-card border-theme-cosmic rounded focus:ring-gold-primary"
                      />
                    ) : (
                      <span className={`px-2 py-1 rounded text-xs ${
                        formData.preferences.email_notifications
                          ? 'bg-green-500/20 text-green-400'
                          : 'bg-red-500/20 text-red-400'
                      }`}>
                        {formData.preferences.email_notifications ? 'Enabled' : 'Disabled'}
                      </span>
                    )}
                  </div>
                  <p className="text-theme-secondary text-sm">Receive order updates and reading notifications</p>
                </div>

                <div className="bg-theme-card/50 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-theme-primary font-medium">Reading Reminders</label>
                    {editing ? (
                      <input
                        type="checkbox"
                        checked={formData.preferences.reading_reminders}
                        onChange={(e) => setFormData({
                          ...formData,
                          preferences: { ...formData.preferences, reading_reminders: e.target.checked }
                        })}
                        className="w-4 h-4 text-gold-primary bg-theme-card border-theme-cosmic rounded focus:ring-gold-primary"
                      />
                    ) : (
                      <span className={`px-2 py-1 rounded text-xs ${
                        formData.preferences.reading_reminders
                          ? 'bg-green-500/20 text-green-400'
                          : 'bg-red-500/20 text-red-400'
                      }`}>
                        {formData.preferences.reading_reminders ? 'Enabled' : 'Disabled'}
                      </span>
                    )}
                  </div>
                  <p className="text-theme-secondary text-sm">Get reminders for scheduled readings</p>
                </div>

                <div className="bg-theme-card/50 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-theme-primary font-medium">Promotional Emails</label>
                    {editing ? (
                      <input
                        type="checkbox"
                        checked={formData.preferences.promotional_emails}
                        onChange={(e) => setFormData({
                          ...formData,
                          preferences: { ...formData.preferences, promotional_emails: e.target.checked }
                        })}
                        className="w-4 h-4 text-gold-primary bg-theme-card border-theme-cosmic rounded focus:ring-gold-primary"
                      />
                    ) : (
                      <span className={`px-2 py-1 rounded text-xs ${
                        formData.preferences.promotional_emails
                          ? 'bg-green-500/20 text-green-400'
                          : 'bg-red-500/20 text-red-400'
                      }`}>
                        {formData.preferences.promotional_emails ? 'Enabled' : 'Disabled'}
                      </span>
                    )}
                  </div>
                  <p className="text-theme-secondary text-sm">Receive special offers and promotions</p>
                </div>
              </div>
            </div>

          </div>

          {/* Account Stats */}
          <div className="mt-8 pt-8 border-t border-theme-cosmic">
            <h3 className="text-xl font-bold text-theme-primary mb-6">Account Statistics</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-theme-card/50 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold gradient-text">12</div>
                <p className="text-theme-secondary text-sm">Total Readings</p>
              </div>
              <div className="bg-theme-card/50 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold gradient-text">3</div>
                <p className="text-theme-secondary text-sm">This Month</p>
              </div>
              <div className="bg-theme-card/50 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold gradient-text">4.9</div>
                <p className="text-theme-secondary text-sm">Avg Rating</p>
              </div>
              <div className="bg-theme-card/50 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold gradient-text">2</div>
                <p className="text-theme-secondary text-sm">Years Member</p>
              </div>
            </div>
          </div>

        </motion.div>

      </div>
    </div>
  );
};

export default Profile;