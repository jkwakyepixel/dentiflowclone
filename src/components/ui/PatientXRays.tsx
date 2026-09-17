import React, { useState } from 'react';
import { useXRays } from '../../hooks/useXRays';
import { Upload, X, Image as ImageIcon, Trash2, Maximize2 } from 'lucide-react';
import toast from 'react-hot-toast';

export function PatientXRays({ patientId }: { patientId: string }) {
  const { xrays, loading, error, uploadXRay, deleteXRay } = useXRays(patientId);
  
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !title) {
      toast.error('Please provide a title and select an image.');
      return;
    }
    
    try {
      setIsUploading(true);
      await uploadXRay(file, title, description);
      toast.success('X-Ray uploaded successfully!');
      setIsUploadModalOpen(false);
      setFile(null);
      setTitle('');
      setDescription('');
    } catch (error: any) {
      toast.error('Failed to upload X-Ray: ' + (error.message || 'Unknown error'));
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async (id: string, url: string) => {
    if (!window.confirm('Are you sure you want to delete this X-Ray? This cannot be undone.')) return;
    try {
      await deleteXRay(id, url);
      toast.success('X-Ray deleted');
    } catch (error) {
      toast.error('Failed to delete X-Ray');
    }
  };

  if (loading) return <div className="text-xs text-slate-400 p-4">Loading X-Rays...</div>;
  if (error) return <div className="text-xs text-red-500 p-4">Error loading X-Rays: {error}. If you just created the index, please wait a minute.</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-slate-900">Patient X-Rays</h3>
        <button
          onClick={() => setIsUploadModalOpen(true)}
          className="bg-[#0284c7] hover:bg-sky-700 text-white text-[10px] font-bold px-3 py-1.5 rounded-lg shadow-xs transition-colors flex items-center gap-1.5"
        >
          <Upload size={14} />
          UPLOAD X-RAY
        </button>
      </div>

      {xrays.length === 0 ? (
        <div className="bg-white border border-slate-100 rounded-2xl p-10 text-center flex flex-col items-center justify-center">
          <div className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center text-slate-300 mb-3">
            <ImageIcon size={24} />
          </div>
          <p className="text-sm font-medium text-slate-900">No X-Rays uploaded yet</p>
          <p className="text-xs text-slate-500 mt-1">Upload dental X-Rays or scans for this patient.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {xrays.map(xray => (
            <div key={xray.id} className="bg-white border border-slate-100 rounded-2xl overflow-hidden shadow-sm group">
              <div 
                className="aspect-square bg-slate-100 relative overflow-hidden cursor-pointer"
                onClick={() => setPreviewImage(xray.fileUrl)}
              >
                <img 
                  src={xray.fileUrl} 
                  alt={xray.title} 
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <Maximize2 className="text-white" size={24} />
                </div>
              </div>
              <div className="p-3">
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 line-clamp-1" title={xray.title}>{xray.title}</h4>
                    <p className="text-[10px] text-slate-500 mt-0.5">{xray.dateUploaded} • By {xray.uploadedBy}</p>
                  </div>
                  <button 
                    onClick={() => handleDelete(xray.id!, xray.fileUrl)}
                    className="text-slate-400 hover:text-red-500 p-1"
                    title="Delete X-Ray"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
                {xray.description && (
                  <p className="text-[10px] text-slate-600 mt-2 line-clamp-2" title={xray.description}>{xray.description}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Upload Modal */}
      {isUploadModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h3 className="text-sm font-bold text-slate-900">Upload Patient X-Ray</h3>
              <button onClick={() => setIsUploadModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleUpload} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Image File</label>
                <input 
                  type="file" 
                  accept="image/*"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                  className="block w-full text-sm text-slate-500
                    file:mr-4 file:py-2 file:px-4
                    file:rounded-xl file:border-0
                    file:text-xs file:font-semibold
                    file:bg-sky-50 file:text-sky-700
                    hover:file:bg-sky-100 cursor-pointer"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Panoramic X-Ray"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl p-2.5 text-sm focus:outline-none focus:border-[#0284c7] focus:ring-1 focus:ring-[#0284c7]"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Description / Notes (Optional)</label>
                <textarea
                  rows={2}
                  placeholder="Any findings or notes..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl p-2.5 text-sm focus:outline-none focus:border-[#0284c7] focus:ring-1 focus:ring-[#0284c7] resize-none"
                />
              </div>
              <div className="pt-2 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsUploadModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUploading || !file || !title}
                  className="px-4 py-2 text-xs font-semibold text-white bg-[#0284c7] hover:bg-sky-700 rounded-xl shadow-xs transition-colors disabled:opacity-50"
                >
                  {isUploading ? 'Uploading...' : 'Upload'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Lightbox Modal */}
      {previewImage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/90 backdrop-blur-sm">
          <button 
            onClick={() => setPreviewImage(null)}
            className="absolute top-4 right-4 text-white/70 hover:text-white p-2"
          >
            <X size={32} />
          </button>
          <img 
            src={previewImage} 
            alt="X-Ray preview" 
            className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl animate-in zoom-in duration-200"
          />
        </div>
      )}
    </div>
  );
}
