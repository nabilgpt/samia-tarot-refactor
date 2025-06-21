import React, { useState, useEffect } from 'react';
import { Star, Search, Filter, Eye, Check, X, AlertTriangle, MessageCircle } from 'lucide-react';
import AdminLayout from '../../components/Layout/AdminLayout';

const AdminReviewsPage = () => {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [ratingFilter, setRatingFilter] = useState('all');

  useEffect(() => {
    fetchReviews();
  }, []);

  const fetchReviews = async () => {
    try {
      setLoading(true);
      // TODO: Replace with actual API call
      const response = await fetch('/api/admin/reviews');
      if (response.ok) {
        const data = await response.json();
        setReviews(data);
      } else {
        // Mock data for now
        setReviews([
          {
            id: 1,
            client: 'أحمد محمد',
            reader: 'سارة أحمد',
            rating: 5,
            comment: 'قراءة ممتازة ودقيقة جداً. أنصح الجميع بالتجربة مع سارة.',
            status: 'pending',
            createdAt: '2024-01-20 14:30',
            serviceType: 'قراءة التاروت',
            flagged: false
          },
          {
            id: 2,
            client: 'فاطمة علي',
            reader: 'محمد علي',
            rating: 4,
            comment: 'جلسة جيدة ولكن كانت قصيرة نوعاً ما.',
            status: 'approved',
            createdAt: '2024-01-19 16:45',
            serviceType: 'قراءة الطالع',
            flagged: false
          },
          {
            id: 3,
            client: 'خالد حسن',
            reader: 'نور فاطمة',
            rating: 2,
            comment: 'لم تكن القراءة دقيقة والقارئة لم تكن متفهمة لحالتي.',
            status: 'flagged',
            createdAt: '2024-01-18 10:20',
            serviceType: 'الأحلام والرؤى',
            flagged: true
          },
          {
            id: 4,
            client: 'مريم أحمد',
            reader: 'سارة أحمد',
            rating: 5,
            comment: 'تجربة رائعة! سارة قارئة محترفة ومتفهمة.',
            status: 'approved',
            createdAt: '2024-01-17 20:15',
            serviceType: 'قراءة التاروت',
            flagged: false
          }
        ]);
      }
    } catch (error) {
      console.error('Error fetching reviews:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleReviewAction = async (reviewId, action) => {
    try {
      // TODO: Implement API call
      console.log(`${action} review ${reviewId}`);
      setReviews(reviews.map(review => 
        review.id === reviewId ? { ...review, status: action } : review
      ));
    } catch (error) {
      console.error('Error updating review:', error);
    }
  };

  const getStatusBadge = (status, flagged) => {
    if (flagged) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300">
          <AlertTriangle className="w-3 h-3 mr-1" />
          مبلغ عنه
        </span>
      );
    }

    const statusConfig = {
      pending: { color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300', text: 'في الانتظار' },
      approved: { color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300', text: 'موافق عليه' },
      rejected: { color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300', text: 'مرفوض' }
    };
    
    const config = statusConfig[status] || statusConfig.pending;
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
        {config.text}
      </span>
    );
  };

  const getRatingStars = (rating) => {
    return Array.from({ length: 5 }, (_, index) => (
      <Star
        key={index}
        className={`w-4 h-4 ${
          index < rating ? 'text-yellow-400 fill-current' : 'text-gray-300'
        }`}
      />
    ));
  };

  const filteredReviews = reviews.filter(review => {
    const matchesSearch = review.comment.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         review.client.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         review.reader.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || 
                         (statusFilter === 'flagged' && review.flagged) ||
                         (statusFilter !== 'flagged' && review.status === statusFilter);
    const matchesRating = ratingFilter === 'all' || review.rating.toString() === ratingFilter;
    return matchesSearch && matchesStatus && matchesRating;
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
              <Star className="w-8 h-8 mr-3 text-purple-600" />
              إدارة المراجعات
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              مراجعة وإدارة تقييمات العملاء
            </p>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="البحث في المراجعات..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-400" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
              >
                <option value="all">جميع الحالات</option>
                <option value="pending">في الانتظار</option>
                <option value="approved">موافق عليه</option>
                <option value="rejected">مرفوض</option>
                <option value="flagged">مبلغ عنه</option>
              </select>
            </div>
            <div className="flex items-center gap-2">
              <Star className="w-4 h-4 text-gray-400" />
              <select
                value={ratingFilter}
                onChange={(e) => setRatingFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
              >
                <option value="all">جميع التقييمات</option>
                <option value="5">5 نجوم</option>
                <option value="4">4 نجوم</option>
                <option value="3">3 نجوم</option>
                <option value="2">2 نجوم</option>
                <option value="1">1 نجمة</option>
              </select>
            </div>
          </div>
        </div>

        {/* Reviews List */}
        <div className="space-y-4">
          {filteredReviews.map((review) => (
            <div key={review.id} className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-4">
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          {review.client}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          قيم {review.reader} • {review.serviceType}
                        </p>
                      </div>
                      <div className="flex items-center">
                        {getRatingStars(review.rating)}
                        <span className="mr-2 text-sm text-gray-600 dark:text-gray-400">
                          ({review.rating}/5)
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {getStatusBadge(review.status, review.flagged)}
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {review.createdAt}
                      </span>
                    </div>
                  </div>
                  
                  <div className="mb-4">
                    <p className="text-gray-700 dark:text-gray-300 text-sm leading-relaxed">
                      {review.comment}
                    </p>
                  </div>

                  {review.status === 'pending' && (
                    <div className="flex items-center space-x-3">
                      <button
                        onClick={() => handleReviewAction(review.id, 'approved')}
                        className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                      >
                        <Check className="w-4 h-4 mr-1" />
                        موافقة
                      </button>
                      <button
                        onClick={() => handleReviewAction(review.id, 'rejected')}
                        className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                      >
                        <X className="w-4 h-4 mr-1" />
                        رفض
                      </button>
                      <button className="inline-flex items-center px-3 py-1.5 border border-gray-300 dark:border-gray-600 text-xs font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500">
                        <Eye className="w-4 h-4 mr-1" />
                        تفاصيل
                      </button>
                    </div>
                  )}

                  {review.flagged && (
                    <div className="mt-3 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
                      <div className="flex items-center">
                        <AlertTriangle className="w-4 h-4 text-red-400 mr-2" />
                        <p className="text-sm text-red-800 dark:text-red-200">
                          تم الإبلاغ عن هذه المراجعة. يرجى المراجعة بعناية.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {filteredReviews.length === 0 && (
          <div className="text-center py-12">
            <MessageCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500 dark:text-gray-400">لا توجد مراجعات تطابق المعايير المحددة</p>
          </div>
        )}

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
            <div className="flex items-center">
              <Star className="w-8 h-8 text-yellow-600" />
              <div className="mr-3">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">إجمالي المراجعات</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{reviews.length}</p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
            <div className="flex items-center">
              <Check className="w-8 h-8 text-green-600" />
              <div className="mr-3">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">موافق عليها</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {reviews.filter(r => r.status === 'approved').length}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
            <div className="flex items-center">
              <AlertTriangle className="w-8 h-8 text-yellow-600" />
              <div className="mr-3">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">في الانتظار</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {reviews.filter(r => r.status === 'pending').length}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
            <div className="flex items-center">
              <X className="w-8 h-8 text-red-600" />
              <div className="mr-3">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">مبلغ عنها</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {reviews.filter(r => r.flagged).length}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminReviewsPage; 