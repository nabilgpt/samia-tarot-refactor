import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase.js';

const BookingsTab = ({ onUpdate }) => {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');
  const [serviceFilter, setServiceFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [showBookingModal, setShowBookingModal] = useState(false);

  useEffect(() => {
    loadBookings();
  }, []);

  const loadBookings = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('bookings')
        .select(`
          *,
          client:profiles!bookings_user_id_fkey(first_name, last_name, email, phone),
          reader:profiles!bookings_reader_id_fkey(first_name, last_name, email),
          service:services(name, type, price, duration_minutes),
          payment:payments(amount, method, status, transaction_id)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setBookings(data || []);
    } catch (error) {
      console.error('Error loading bookings:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateBookingStatus = async (bookingId, newStatus) => {
    try {
      const { error } = await supabase
        .from('bookings')
        .update({ status: newStatus })
        .eq('id', bookingId);

      if (!error) {
        await loadBookings();
        onUpdate?.();
      }
    } catch (error) {
      console.error('Error updating booking status:', error);
    }
  };

  const exportBookings = () => {
    const csvContent = [
      ['ID', 'Client', 'Reader', 'Service', 'Date', 'Status', 'Amount', 'Payment Method'].join(','),
      ...filteredBookings.map(booking => [
        booking.id,
        `${booking.client?.first_name} ${booking.client?.last_name}`,
        `${booking.reader?.first_name} ${booking.reader?.last_name}`,
        booking.service?.name,
        new Date(booking.scheduled_at).toLocaleDateString(),
        booking.status,
        booking.payment?.amount || 'N/A',
        booking.payment?.method || 'N/A'
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bookings-export-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const filteredBookings = bookings.filter(booking => {
    const matchesStatus = statusFilter === 'all' || booking.status === statusFilter;
    const matchesService = serviceFilter === 'all' || booking.service?.type === serviceFilter;
    
    let matchesDate = true;
    if (dateFilter !== 'all') {
      const bookingDate = new Date(booking.scheduled_at);
      const now = new Date();
      
      switch (dateFilter) {
        case 'today':
          matchesDate = bookingDate.toDateString() === now.toDateString();
          break;
        case 'week': {
          const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          matchesDate = bookingDate >= weekAgo;
          break;
        }
        case 'month': {
          const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          matchesDate = bookingDate >= monthAgo;
          break;
        }
      }
    }
    
    return matchesStatus && matchesService && matchesDate;
  });

  const getStatusColor = (status) => {
    switch (status) {
      case 'confirmed': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'completed': return 'bg-blue-100 text-blue-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      case 'in_progress': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDateTime = (dateString) => {
    return new Date(dateString).toLocaleString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
        >
          <option value="all">All Statuses</option>
          <option value="pending">Pending</option>
          <option value="confirmed">Confirmed</option>
          <option value="in_progress">In Progress</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
        </select>

        <select
          value={serviceFilter}
          onChange={(e) => setServiceFilter(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
        >
          <option value="all">All Services</option>
          <option value="tarot">Tarot Reading</option>
          <option value="coffee">Coffee Reading</option>
          <option value="palm">Palm Reading</option>
          <option value="dream">Dream Analysis</option>
          <option value="call">Voice Call</option>
        </select>

        <select
          value={dateFilter}
          onChange={(e) => setDateFilter(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
        >
          <option value="all">All Dates</option>
          <option value="today">Today</option>
          <option value="week">Last 7 Days</option>
          <option value="month">Last 30 Days</option>
        </select>

        <div className="text-sm text-gray-600 flex items-center">
          Showing {filteredBookings.length} of {bookings.length} bookings
        </div>
      </div>

      {/* Bookings Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Client</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Reader</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Service</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date & Time</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Payment</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan="8" className="px-6 py-4 text-center text-gray-500">
                    Loading bookings...
                  </td>
                </tr>
              ) : filteredBookings.length === 0 ? (
                <tr>
                  <td colSpan="8" className="px-6 py-4 text-center text-gray-500">
                    No bookings found
                  </td>
                </tr>
              ) : (
                filteredBookings.map((booking) => (
                  <tr key={booking.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900">
                      #{booking.id.slice(0, 8)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {booking.client?.first_name} {booking.client?.last_name}
                      </div>
                      <div className="text-sm text-gray-500">{booking.client?.email}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {booking.reader?.first_name} {booking.reader?.last_name}
                      </div>
                      <div className="text-sm text-gray-500">{booking.reader?.email}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{booking.service?.name}</div>
                      <div className="text-sm text-gray-500">
                        ${booking.service?.price} • {booking.service?.duration_minutes}min
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatDateTime(booking.scheduled_at)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <select
                        value={booking.status}
                        onChange={(e) => updateBookingStatus(booking.id, e.target.value)}
                        className={`px-2 py-1 rounded-full text-xs font-medium border-0 ${getStatusColor(booking.status)}`}
                      >
                        <option value="pending">Pending</option>
                        <option value="confirmed">Confirmed</option>
                        <option value="in_progress">In Progress</option>
                        <option value="completed">Completed</option>
                        <option value="cancelled">Cancelled</option>
                      </select>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {booking.payment ? (
                        <div className="text-sm">
                          <div className="font-medium text-gray-900">${booking.payment.amount}</div>
                          <div className="text-gray-500">{booking.payment.method}</div>
                        </div>
                      ) : (
                        <span className="text-sm text-gray-500">No payment</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={() => {
                          setSelectedBooking(booking);
                          setShowBookingModal(true);
                        }}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        View Details
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Booking Details Modal */}
      {showBookingModal && selectedBooking && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-96 overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Booking Details</h3>
              <button
                onClick={() => setShowBookingModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Booking ID</label>
                <p className="text-gray-900 font-mono">#{selectedBooking.id}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Status</label>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(selectedBooking.status)}`}>
                  {selectedBooking.status}
                </span>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Client</label>
                <p className="text-gray-900">
                  {selectedBooking.client?.first_name} {selectedBooking.client?.last_name}
                </p>
                <p className="text-sm text-gray-500">{selectedBooking.client?.email}</p>
                <p className="text-sm text-gray-500">{selectedBooking.client?.phone}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Reader</label>
                <p className="text-gray-900">
                  {selectedBooking.reader?.first_name} {selectedBooking.reader?.last_name}
                </p>
                <p className="text-sm text-gray-500">{selectedBooking.reader?.email}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Service</label>
                <p className="text-gray-900">{selectedBooking.service?.name}</p>
                <p className="text-sm text-gray-500">
                  ${selectedBooking.service?.price} • {selectedBooking.service?.duration_minutes} minutes
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Scheduled</label>
                <p className="text-gray-900">{formatDateTime(selectedBooking.scheduled_at)}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Created</label>
                <p className="text-gray-900">{formatDateTime(selectedBooking.created_at)}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Payment</label>
                {selectedBooking.payment ? (
                  <div>
                    <p className="text-gray-900">${selectedBooking.payment.amount}</p>
                    <p className="text-sm text-gray-500">
                      {selectedBooking.payment.method} • {selectedBooking.payment.status}
                    </p>
                    {selectedBooking.payment.transaction_id && (
                      <p className="text-xs text-gray-400 font-mono">
                        {selectedBooking.payment.transaction_id}
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="text-gray-500">No payment recorded</p>
                )}
              </div>
            </div>

            {selectedBooking.notes && (
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700">Notes</label>
                <p className="text-gray-900">{selectedBooking.notes}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default BookingsTab; 