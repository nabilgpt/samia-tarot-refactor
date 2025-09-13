import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import CosmicButton from '../../components/UI/CosmicButton';
import { 
  DocumentTextIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
  EyeIcon,
  ArrowDownTrayIcon,
  TrashIcon
} from '@heroicons/react/24/outline';

const AdminDSRPage = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [selectedRequest, setSelectedRequest] = useState(null);

  useEffect(() => {
    fetchDSRRequests();
  }, [filter]);

  const fetchDSRRequests = async () => {
    setLoading(true);
    try {
      // Simulate API call - replace with actual endpoint
      const mockRequests = [
        {
          id: 1,
          user_id: 'user123',
          user_email: 'user@example.com',
          request_type: 'export',
          status: 'pending',
          verification_method: 'email',
          created_at: '2025-01-10T10:00:00Z',
          expiry_date: '2025-02-09T10:00:00Z',
          verified_at: null,
          admin_approved_by: null,
          scheduled_for: null
        },
        {
          id: 2,
          user_id: 'user456',
          user_email: 'another@example.com',
          request_type: 'delete',
          status: 'verified',
          verification_method: 'email',
          created_at: '2025-01-09T15:30:00Z',
          expiry_date: '2025-02-08T15:30:00Z',
          verified_at: '2025-01-09T16:00:00Z',
          admin_approved_by: null,
          scheduled_for: null
        },
        {
          id: 3,
          user_id: 'user789',
          user_email: 'test@example.com',
          request_type: 'delete',
          status: 'processing',
          verification_method: 'email',
          created_at: '2025-01-08T09:15:00Z',
          expiry_date: '2025-02-07T09:15:00Z',
          verified_at: '2025-01-08T10:00:00Z',
          admin_approved_by: 'admin123',
          scheduled_for: '2025-01-11T10:00:00Z'
        }
      ];
      
      let filteredRequests = mockRequests;
      if (filter !== 'all') {
        filteredRequests = mockRequests.filter(req => req.status === filter);
      }
      
      setRequests(filteredRequests);
    } catch (error) {
      console.error('Failed to fetch DSR requests:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApproveExport = async (requestId) => {
    try {
      const response = await fetch(`/api/dsr/export/${requestId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        fetchDSRRequests();
        alert('Export request approved and processing started');
      }
    } catch (error) {
      console.error('Failed to approve export:', error);
      alert('Failed to approve export request');
    }
  };

  const handleApproveDeletion = async (requestId, gracePeriodHours = 72) => {
    try {
      const response = await fetch(`/api/dsr/delete/${requestId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ grace_period_hours: gracePeriodHours })
      });

      if (response.ok) {
        fetchDSRRequests();
        alert(`Deletion approved with ${gracePeriodHours} hour grace period`);
      }
    } catch (error) {
      console.error('Failed to approve deletion:', error);
      alert('Failed to approve deletion request');
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'pending':
        return <ClockIcon className="h-5 w-5 text-yellow-400" />;
      case 'verified':
        return <CheckCircleIcon className="h-5 w-5 text-blue-400" />;
      case 'processing':
        return <ExclamationTriangleIcon className="h-5 w-5 text-orange-400" />;
      case 'completed':
        return <CheckCircleIcon className="h-5 w-5 text-green-400" />;
      case 'rejected':
        return <XCircleIcon className="h-5 w-5 text-red-400" />;
      default:
        return <ClockIcon className="h-5 w-5 text-gray-400" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return 'text-yellow-400 bg-yellow-400/10';
      case 'verified': return 'text-blue-400 bg-blue-400/10';
      case 'processing': return 'text-orange-400 bg-orange-400/10';
      case 'completed': return 'text-green-400 bg-green-400/10';
      case 'rejected': return 'text-red-400 bg-red-400/10';
      default: return 'text-gray-400 bg-gray-400/10';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-black p-6">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mb-8"
        >
          <h1 className="text-3xl font-bold text-white mb-4">
            DSR Request Management
          </h1>
          <p className="text-gray-300">
            GDPR Article 15/17 compliance - Manage data subject rights requests with audit trails
          </p>
        </motion.div>

        {/* Filter Tabs */}
        <div className="flex space-x-4 mb-6">
          {[
            { key: 'all', label: 'All Requests' },
            { key: 'pending', label: 'Pending' },
            { key: 'verified', label: 'Verified' },
            { key: 'processing', label: 'Processing' },
            { key: 'completed', label: 'Completed' }
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key)}
              className={`px-4 py-2 rounded-lg transition-colors ${
                filter === tab.key
                  ? 'bg-cosmic-purple text-white'
                  : 'bg-white/10 text-gray-300 hover:bg-white/20'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* DSR Requests Table */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl overflow-hidden"
        >
          {loading ? (
            <div className="p-8 text-center">
              <div className="animate-spin w-8 h-8 border-2 border-cosmic-purple border-t-transparent rounded-full mx-auto mb-4"></div>
              <p className="text-gray-400">Loading DSR requests...</p>
            </div>
          ) : requests.length === 0 ? (
            <div className="p-8 text-center">
              <DocumentTextIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-400">No DSR requests found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b border-white/20">
                  <tr>
                    <th className="text-left p-4 text-gray-300 font-medium">Request ID</th>
                    <th className="text-left p-4 text-gray-300 font-medium">User</th>
                    <th className="text-left p-4 text-gray-300 font-medium">Type</th>
                    <th className="text-left p-4 text-gray-300 font-medium">Status</th>
                    <th className="text-left p-4 text-gray-300 font-medium">Created</th>
                    <th className="text-left p-4 text-gray-300 font-medium">Expires</th>
                    <th className="text-right p-4 text-gray-300 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {requests.map((request) => (
                    <tr key={request.id} className="border-b border-white/10 hover:bg-white/5 transition-colors">
                      <td className="p-4 text-white font-mono">#{request.id}</td>
                      <td className="p-4">
                        <div>
                          <div className="text-white font-medium">{request.user_email}</div>
                          <div className="text-gray-400 text-sm">ID: {request.user_id}</div>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center space-x-2">
                          {request.request_type === 'export' ? (
                            <ArrowDownTrayIcon className="h-4 w-4 text-blue-400" />
                          ) : (
                            <TrashIcon className="h-4 w-4 text-red-400" />
                          )}
                          <span className="text-white capitalize">{request.request_type}</span>
                        </div>
                      </td>
                      <td className="p-4">
                        <span className={`inline-flex items-center space-x-2 px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(request.status)}`}>
                          {getStatusIcon(request.status)}
                          <span className="capitalize">{request.status}</span>
                        </span>
                      </td>
                      <td className="p-4 text-gray-300 text-sm">
                        {new Date(request.created_at).toLocaleDateString()}
                      </td>
                      <td className="p-4 text-gray-300 text-sm">
                        {new Date(request.expiry_date).toLocaleDateString()}
                      </td>
                      <td className="p-4">
                        <div className="flex items-center justify-end space-x-2">
                          <CosmicButton
                            variant="outline"
                            size="sm"
                            onClick={() => setSelectedRequest(request)}
                          >
                            <EyeIcon className="h-4 w-4 mr-1" />
                            View
                          </CosmicButton>
                          
                          {request.status === 'verified' && (
                            <>
                              {request.request_type === 'export' && (
                                <CosmicButton
                                  variant="cosmic"
                                  size="sm"
                                  onClick={() => handleApproveExport(request.id)}
                                >
                                  <ArrowDownTrayIcon className="h-4 w-4 mr-1" />
                                  Export
                                </CosmicButton>
                              )}
                              
                              {request.request_type === 'delete' && (
                                <CosmicButton
                                  variant="danger"
                                  size="sm"
                                  onClick={() => handleApproveDeletion(request.id)}
                                >
                                  <TrashIcon className="h-4 w-4 mr-1" />
                                  Delete
                                </CosmicButton>
                              )}
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </motion.div>

        {/* Quick Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6"
        >
          <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-6 text-center">
            <h3 className="text-lg font-semibold text-white mb-2">Pending Requests</h3>
            <p className="text-2xl font-bold text-yellow-400">
              {requests.filter(r => r.status === 'pending').length}
            </p>
            <p className="text-gray-400 text-sm">Awaiting verification</p>
          </div>
          
          <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-6 text-center">
            <h3 className="text-lg font-semibold text-white mb-2">Verified Requests</h3>
            <p className="text-2xl font-bold text-blue-400">
              {requests.filter(r => r.status === 'verified').length}
            </p>
            <p className="text-gray-400 text-sm">Require admin action</p>
          </div>
          
          <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-6 text-center">
            <h3 className="text-lg font-semibold text-white mb-2">Processing</h3>
            <p className="text-2xl font-bold text-orange-400">
              {requests.filter(r => r.status === 'processing').length}
            </p>
            <p className="text-gray-400 text-sm">In progress</p>
          </div>
        </motion.div>

        {/* Request Detail Modal */}
        {selectedRequest && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex justify-between items-start mb-6">
                  <h2 className="text-xl font-semibold text-white">
                    DSR Request #{selectedRequest.id}
                  </h2>
                  <button
                    onClick={() => setSelectedRequest(null)}
                    className="text-gray-400 hover:text-white"
                  >
                    ✕
                  </button>
                </div>

                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1">User Email</label>
                      <p className="text-white">{selectedRequest.user_email}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1">Request Type</label>
                      <p className="text-white capitalize">{selectedRequest.request_type}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1">Status</label>
                      <span className={`inline-flex items-center space-x-2 px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(selectedRequest.status)}`}>
                        {getStatusIcon(selectedRequest.status)}
                        <span className="capitalize">{selectedRequest.status}</span>
                      </span>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1">Verification Method</label>
                      <p className="text-white capitalize">{selectedRequest.verification_method}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1">Created At</label>
                      <p className="text-white text-sm">{new Date(selectedRequest.created_at).toLocaleString()}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1">Expires At</label>
                      <p className="text-white text-sm">{new Date(selectedRequest.expiry_date).toLocaleString()}</p>
                    </div>
                  </div>

                  {selectedRequest.verified_at && (
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1">Verified At</label>
                      <p className="text-white text-sm">{new Date(selectedRequest.verified_at).toLocaleString()}</p>
                    </div>
                  )}

                  {selectedRequest.scheduled_for && (
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1">Scheduled For</label>
                      <p className="text-white text-sm">{new Date(selectedRequest.scheduled_for).toLocaleString()}</p>
                    </div>
                  )}
                </div>

                <div className="mt-6 flex justify-end space-x-3">
                  <CosmicButton
                    variant="outline"
                    onClick={() => setSelectedRequest(null)}
                  >
                    Close
                  </CosmicButton>
                  
                  {selectedRequest.status === 'verified' && (
                    <>
                      {selectedRequest.request_type === 'export' && (
                        <CosmicButton
                          variant="cosmic"
                          onClick={() => {
                            handleApproveExport(selectedRequest.id);
                            setSelectedRequest(null);
                          }}
                        >
                          <ArrowDownTrayIcon className="h-4 w-4 mr-2" />
                          Approve Export
                        </CosmicButton>
                      )}
                      
                      {selectedRequest.request_type === 'delete' && (
                        <CosmicButton
                          variant="danger"
                          onClick={() => {
                            handleApproveDeletion(selectedRequest.id);
                            setSelectedRequest(null);
                          }}
                        >
                          <TrashIcon className="h-4 w-4 mr-2" />
                          Approve Deletion
                        </CosmicButton>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDSRPage;