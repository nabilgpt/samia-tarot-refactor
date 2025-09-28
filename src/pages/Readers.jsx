import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Star, Circle, User } from 'lucide-react';
import api from '../lib/api';

const Readers = () => {
  const [readers, setReaders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchReaders = async () => {
      try {
        setLoading(true);
        const data = await api.getReaders();
        setReaders(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchReaders();
  }, []);

  if (loading) {
    return (
      <div className="container py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="card animate-pulse">
              <div className="h-32 bg-theme-cosmic/20 rounded-t-xl"></div>
              <div className="p-6 space-y-3">
                <div className="h-6 bg-theme-cosmic/20 rounded w-3/4"></div>
                <div className="h-4 bg-theme-cosmic/20 rounded w-1/2"></div>
                <div className="h-16 bg-theme-cosmic/20 rounded"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container py-12">
        <div className="card bg-red-500/10 border-red-500/30 p-6 text-center">
          <p className="text-red-400">Failed to load readers: {error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-12">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold gradient-text mb-4">
            Our Readers
          </h1>
          <p className="text-theme-secondary max-w-2xl mx-auto">
            Connect with experienced spiritual guides for personalized readings
          </p>
        </div>

        {readers.length === 0 ? (
          <div className="card p-12 text-center">
            <p className="text-theme-muted">No readers available at the moment.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {readers.map((reader) => (
              <motion.div
                key={reader.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                whileHover={{ scale: 1.02 }}
                transition={{ duration: 0.3 }}
                className="card group overflow-hidden"
              >
                <div className="relative h-32 bg-gradient-to-br from-gold-primary/20 to-purple-500/20 flex items-center justify-center">
                  <div className="w-20 h-20 rounded-full bg-gradient-to-br from-gold-primary to-purple-500 flex items-center justify-center">
                    <User className="w-10 h-10 text-theme-inverse" />
                  </div>

                  <div className="absolute top-4 right-4">
                    {reader.online ? (
                      <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-green-500/20 border border-green-500/50">
                        <Circle className="w-2 h-2 fill-green-500 text-green-500 animate-pulse" />
                        <span className="text-xs font-semibold text-green-400">Online</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-theme-cosmic/30 border border-theme-cosmic/50">
                        <Circle className="w-2 h-2 fill-theme-muted text-theme-muted" />
                        <span className="text-xs font-semibold text-theme-muted">Offline</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="p-6">
                  <h3 className="text-xl font-bold text-theme-primary mb-1">
                    {reader.firstName} {reader.lastName}
                  </h3>

                  {reader.rating && (
                    <div className="flex items-center gap-2 mb-3">
                      <div className="flex items-center gap-1">
                        <Star className="w-4 h-4 fill-gold-primary text-gold-primary" />
                        <span className="text-sm font-semibold text-gold-primary">{reader.rating}</span>
                      </div>
                      <span className="text-xs text-theme-muted">
                        ({reader.total_readings} readings)
                      </span>
                    </div>
                  )}

                  <p className="text-sm text-theme-secondary mb-4 line-clamp-2">
                    {reader.bio}
                  </p>

                  {reader.specialties && reader.specialties.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-4">
                      {reader.specialties.slice(0, 3).map((specialty) => (
                        <span
                          key={specialty}
                          className="px-2 py-1 text-xs rounded-full bg-gold-primary/10 text-gold-primary border border-gold-primary/30"
                        >
                          {specialty.replace('_', ' ')}
                        </span>
                      ))}
                    </div>
                  )}

                  <Link
                    to={`/checkout?reader=${reader.id}`}
                    className="btn-primary w-full text-center"
                  >
                    Book Session
                  </Link>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default Readers;