import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useDropzone } from 'react-dropzone';
import { Upload, CheckCircle, XCircle, AlertTriangle, FileImage, Trash2, Eye } from 'lucide-react';
import { getRTLClasses, getMobileRowClasses } from '../../utils/rtlUtils';
import { useResponsive } from '../../hooks/useResponsive';

const DeckBulkUploader = ({ onUploadComplete }) => {
  const [uploadSession, setUploadSession] = useState(null);
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [validationResults, setValidationResults] = useState(null);
  const [deckName, setDeckName] = useState('');
  const [description, setDescription] = useState('');
  const { isMobile } = useResponsive();

  const requiredFiles = [
    ...Array.from({ length: 78 }, (_, i) => `Card_${i.toString().padStart(2, '0')}.webp`),
    'back.webp'
  ];

  const onDrop = useCallback((acceptedFiles) => {
    setFiles(acceptedFiles);
    validateFiles(acceptedFiles);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/webp': ['.webp'],
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png']
    },
    maxFiles: 79,
    maxSize: 10 * 1024 * 1024 // 10MB
  });

  const validateFiles = async (filesToValidate) => {
    const formData = new FormData();
    filesToValidate.forEach(file => {
      formData.append('cards', file);
    });

    try {
      const response = await fetch('/api/deck-upload/validate', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: formData
      });

      const results = await response.json();
      setValidationResults(results);
    } catch (error) {
      console.error('Validation error:', error);
    }
  };

  const createSession = async () => {
    if (!deckName.trim()) {
      alert('Please enter a deck name');
      return;
    }

    try {
      const response = await fetch('/api/deck-upload/sessions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          deck_name: deckName,
          description: description
        })
      });

      const session = await response.json();
      setUploadSession(session);
      return session;
    } catch (error) {
      console.error('Session creation error:', error);
      throw error;
    }
  };

  const uploadFiles = async () => {
    if (!files.length || !validationResults?.valid) {
      alert('Please add valid files before uploading');
      return;
    }

    setUploading(true);

    try {
      let session = uploadSession;
      if (!session) {
        session = await createSession();
      }

      const formData = new FormData();
      files.forEach(file => {
        formData.append('cards', file);
      });

      const response = await fetch(`/api/deck-upload/sessions/${session.id}/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: formData
      });

      const result = await response.json();
      
      if (result.status === 'completed' || result.status === 'partial') {
        onUploadComplete?.(result);
      }

    } catch (error) {
      console.error('Upload error:', error);
      alert('Upload failed: ' + error.message);
    } finally {
      setUploading(false);
    }
  };

  const resetUploader = () => {
    setFiles([]);
    setValidationResults(null);
    setUploadSession(null);
    setDeckName('');
    setDescription('');
  };

  const getFileStatus = (fileName) => {
    if (!validationResults) return 'pending';
    const result = validationResults.results.find(r => r.fileName === fileName);
    return result?.valid ? 'valid' : 'invalid';
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'valid': return <CheckCircle className="w-4 h-4 text-green-400" />;
      case 'invalid': return <XCircle className="w-4 h-4 text-red-400" />;
      default: return <AlertTriangle className="w-4 h-4 text-yellow-400" />;
    }
  };

  return (
    <div className={`space-y-6 ${getRTLClasses()}`}>
      {/* Header */}
      <div className="text-center">
        <h3 className="text-xl font-bold text-cosmic-text mb-2">
          Deck Bulk Upload (78+1 Cards)
        </h3>
        <p className="text-cosmic-text/70 text-sm">
          Upload Card_00.webp through Card_77.webp + back.webp
        </p>
      </div>

      {/* Deck Info Form */}
      {!uploadSession && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-cosmic-panel/20 backdrop-blur-sm border border-cosmic-accent/30 rounded-xl p-4 space-y-4"
        >
          <div>
            <label className="block text-sm font-medium text-cosmic-text mb-2">
              Deck Name *
            </label>
            <input
              type="text"
              value={deckName}
              onChange={(e) => setDeckName(e.target.value)}
              className="w-full px-3 py-2 bg-cosmic-dark/50 border border-cosmic-accent/30 rounded-lg text-cosmic-text placeholder-cosmic-text/50 focus:border-cosmic-accent focus:outline-none"
              placeholder="Enter deck name..."
              maxLength={100}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-cosmic-text mb-2">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 bg-cosmic-dark/50 border border-cosmic-accent/30 rounded-lg text-cosmic-text placeholder-cosmic-text/50 focus:border-cosmic-accent focus:outline-none resize-none"
              placeholder="Optional description..."
              rows="3"
              maxLength={500}
            />
          </div>
        </motion.div>
      )}

      {/* File Drop Zone */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        {...getRootProps()}
        className={`
          border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-300
          ${isDragActive 
            ? 'border-cosmic-accent bg-cosmic-accent/10' 
            : 'border-cosmic-accent/30 hover:border-cosmic-accent/50'
          }
        `}
      >
        <input {...getInputProps()} />
        <Upload className="w-12 h-12 text-cosmic-accent mx-auto mb-4" />
        <p className="text-cosmic-text mb-2">
          {isDragActive 
            ? 'Drop files here...' 
            : 'Drag & drop 79 card files here'
          }
        </p>
        <p className="text-cosmic-text/60 text-sm">
          WebP, JPEG, PNG files up to 10MB each
        </p>
        <button 
          type="button"
          className="mt-4 px-4 py-2 bg-cosmic-accent/20 hover:bg-cosmic-accent/30 border border-cosmic-accent rounded-lg text-cosmic-accent transition-colors"
        >
          Browse Files
        </button>
      </motion.div>

      {/* File List */}
      <AnimatePresence>
        {files.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-cosmic-panel/20 backdrop-blur-sm border border-cosmic-accent/30 rounded-xl p-4"
          >
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-medium text-cosmic-text">
                Files ({files.length}/79)
              </h4>
              <button
                onClick={resetUploader}
                className="text-cosmic-text/60 hover:text-red-400 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>

            {/* Validation Summary */}
            {validationResults && (
              <div className={`mb-4 p-3 rounded-lg ${
                validationResults.valid 
                  ? 'bg-green-500/10 border border-green-500/30' 
                  : 'bg-red-500/10 border border-red-500/30'
              }`}>
                <div className="flex items-center gap-2 mb-2">
                  {validationResults.valid 
                    ? <CheckCircle className="w-4 h-4 text-green-400" />
                    : <XCircle className="w-4 h-4 text-red-400" />
                  }
                  <span className={`text-sm font-medium ${
                    validationResults.valid ? 'text-green-400' : 'text-red-400'
                  }`}>
                    {validationResults.valid ? 'All files valid' : 'Validation failed'}
                  </span>
                </div>
                
                {validationResults.missingFiles?.length > 0 && (
                  <p className="text-red-400 text-xs mb-1">
                    Missing: {validationResults.missingFiles.slice(0, 5).join(', ')}
                    {validationResults.missingFiles.length > 5 && ` +${validationResults.missingFiles.length - 5} more`}
                  </p>
                )}
                
                {validationResults.extraFiles?.length > 0 && (
                  <p className="text-yellow-400 text-xs">
                    Extra: {validationResults.extraFiles.slice(0, 5).join(', ')}
                    {validationResults.extraFiles.length > 5 && ` +${validationResults.extraFiles.length - 5} more`}
                  </p>
                )}
              </div>
            )}

            {/* File Grid */}
            <div className={`grid gap-2 ${
              isMobile ? 'grid-cols-1' : 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4'
            }`}>
              {files.map((file, index) => {
                const status = getFileStatus(file.name);
                return (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: index * 0.02 }}
                    className={`${getMobileRowClasses()} bg-cosmic-dark/30 rounded-lg p-2 border ${
                      status === 'valid' ? 'border-green-500/30' :
                      status === 'invalid' ? 'border-red-500/30' :
                      'border-cosmic-accent/30'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <FileImage className="w-4 h-4 text-cosmic-accent flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-cosmic-text truncate">
                          {file.name}
                        </p>
                        <p className="text-xs text-cosmic-text/60">
                          {(file.size / 1024 / 1024).toFixed(1)}MB
                        </p>
                      </div>
                      {getStatusIcon(status)}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Action Buttons */}
      {files.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex gap-3"
        >
          <button
            onClick={uploadFiles}
            disabled={uploading || !validationResults?.valid || !deckName.trim()}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-cosmic-accent hover:bg-cosmic-accent/80 disabled:bg-cosmic-accent/30 disabled:cursor-not-allowed rounded-lg text-white font-medium transition-colors"
          >
            {uploading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4" />
                Upload Deck
              </>
            )}
          </button>
          
          <button
            onClick={resetUploader}
            className="px-4 py-3 bg-cosmic-panel/20 hover:bg-cosmic-panel/30 border border-cosmic-accent/30 rounded-lg text-cosmic-text transition-colors"
          >
            Reset
          </button>
        </motion.div>
      )}

      {/* Required Files Reference */}
      <motion.details
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="bg-cosmic-panel/10 border border-cosmic-accent/20 rounded-lg p-4"
      >
        <summary className="cursor-pointer text-cosmic-text/70 text-sm font-medium">
          View Required File Names ({requiredFiles.length} files)
        </summary>
        <div className="mt-3 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-1 text-xs text-cosmic-text/60">
          {requiredFiles.map(fileName => (
            <code key={fileName} className="block">
              {fileName}
            </code>
          ))}
        </div>
      </motion.details>
    </div>
  );
};

export default DeckBulkUploader;