import { useEffect, useState } from 'react';
import { useEvent } from '../context/EventContext';
import { getCertificates, uploadCertificateTemplate, createCertificate, getForms, deleteCertificate as apiDeleteCertificate, generateCertificate as apiGenerateCertificate } from '../services/api';
import FieldMapping from '../components/certificates/FieldMapping';
import Loader from '../components/common/Loader';
import Toast from '../components/common/Toast';
import Modal from '../components/common/Modal';

export default function Certificates() {
  const [certificates, setCertificates] = useState([]);
  const [loading, setLoading] = useState(true);
  const { activeEventId } = useEvent();
  const [toast, setToast] = useState('');
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedCertificate, setSelectedCertificate] = useState(null);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [forms, setForms] = useState([]);
  
  // Form fields and PDF fields for mapping
  const formFields = ['Name'];
  const pdfFields = ['Full Name'];
  const [fieldMap, setFieldMap] = useState({});
  const [newCertificate, setNewCertificate] = useState({
    name: '',
    description: '',
    template: null,
    formId: '',
    fieldMapping: {}
  });

  useEffect(() => {
    loadCertificates();
    loadForms();
  }, [activeEventId]);

  const loadCertificates = async () => {
    try {
      const response = await getCertificates();
      const items = response.data || [];
      setCertificates(items);
      if (!selectedCertificate && items.length > 0) {
        setSelectedCertificate(items[0]);
      }
    } catch (error) {
      setToast('Failed to load certificates');
    } finally {
      setLoading(false);
    }
  };

  const loadForms = async () => {
    try {
      const res = await getForms();
      setForms(res.data || []);
    } catch (e) {
      // keep silent but allow manual entry
    }
  };

  const handleFileChange = (e) => {
    const picked = e.target.files[0];
    setFile(picked);
    if (!selectedCertificate && picked) {
      const baseName = picked.name?.replace(/\.[^.]+$/, '') || '';
      setNewCertificate((prev) => ({ ...prev, name: baseName }));
      setShowCreateModal(true);
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    if (!selectedCertificate) {
      setToast('Select or create a certificate first.');
      return;
    }
    setUploading(true);
    try {
      await uploadCertificateTemplate(selectedCertificate._id, file);
      setToast('Template uploaded successfully!');
      setFile(null);
      await loadCertificates();
    } catch (error) {
      setToast(error?.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleCreateCertificate = () => {
    setNewCertificate({
      name: '',
      description: '',
      template: null,
      formId: '',
      fieldMapping: {}
    });
    setShowCreateModal(true);
  };

  const handleSaveCertificate = async () => {
    // Validate inputs
    if (!newCertificate.name?.trim()) {
      setToast('Enter a certificate name');
      return;
    }
    if (!newCertificate.formId) {
      setToast('Select an associated form');
      return;
    }
    if (!file) {
      setToast('Choose a template file to create the certificate');
      return;
    }
    setCreating(true);
    try {
      let payload = { ...newCertificate };
      // convert file to base64
      const toBase64 = (f) => new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result.split(',')[1]);
        reader.onerror = reject;
        reader.readAsDataURL(f);
      });
      payload = { ...payload, template: await toBase64(file) };
      const res = await createCertificate(payload);
      setToast('Certificate created successfully!');
      setShowCreateModal(false);
      setSelectedCertificate(res.data);
      await loadCertificates();
      setFile(null);
    } catch (error) {
      setToast(error?.message || 'Failed to create certificate');
    } finally {
      setCreating(false);
    }
  };

  const handleViewCertificate = (cert) => {
    setSelectedCertificate(cert);
    setShowPreviewModal(true);
  };

  const handleDeleteCertificate = async (certId) => {
    if (window.confirm('Are you sure you want to delete this certificate?')) {
      try {
        await apiDeleteCertificate(certId);
        setToast('Certificate deleted successfully!');
        loadCertificates();
      } catch (error) {
        setToast('Failed to delete certificate');
      }
    }
  };

  const handleDownloadCertificate = async (certId) => {
    try {
      // Use preview endpoint for now (server streams inline PDF)
      const res = await fetch(`http://localhost:5000/api/certificates/${certId}/preview`, {
        method: 'GET',
        credentials: 'include'
      });
      if (!res.ok) throw new Error('Failed to fetch preview');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `certificate-${certId}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      setToast('Certificate download started!');
    } catch (error) {
      setToast('Failed to download certificate');
    }
  };

  if (loading) return <Loader />;

  return (
    <div className="space-y-8">
      {/* Header Section */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">🏆 Certificate Management</h1>
          <p className="text-gray-300">Create, manage, and distribute certificates for your events</p>
        </div>
        <button 
          onClick={handleCreateCertificate}
          className="bg-black text-white rounded-2xl px-6 py-3 font-semibold hover:bg-white hover:text-black border border-white transition-all"
        >
          🏆 Create Certificate
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-black border border-white rounded-2xl p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-300 text-sm">Total Certificates</p>
              <p className="text-2xl font-bold">{certificates.length}</p>
            </div>
            <div className="text-3xl">🏆</div>
          </div>
        </div>
        <div className="bg-black border border-white rounded-2xl p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-300 text-sm">Delivered</p>
              <p className="text-2xl font-bold">{certificates.filter(c => c.sent).length}</p>
            </div>
            <div className="text-3xl">✅</div>
          </div>
        </div>
        <div className="bg-black border border-white rounded-2xl p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-300 text-sm">Pending</p>
              <p className="text-2xl font-bold">{certificates.filter(c => !c.sent).length}</p>
            </div>
            <div className="text-3xl">⏳</div>
          </div>
        </div>
        <div className="bg-black border border-white rounded-2xl p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-300 text-sm">Templates</p>
              <p className="text-2xl font-bold">3</p>
            </div>
            <div className="text-3xl">📄</div>
          </div>
        </div>
      </div>

      {/* Template Upload Section */}
      <div className="bg-black border-2 border-dashed border-white rounded-2xl shadow-xl p-8 mb-8">
        <div className="text-center mb-6">
          <div className="text-4xl mb-4">📤</div>
          <h3 className="text-2xl font-bold text-white mb-2">Upload Certificate Template</h3>
          <p className="text-gray-300">Upload a PDF or image template for your certificates</p>
        </div>
        <div className="flex flex-col items-center space-y-4">
          <div className="relative">
            <input 
              type="file" 
              accept="application/pdf,image/*" 
              onChange={handleFileChange} 
              className="hidden"
              id="template-upload"
            />
            <label 
              htmlFor="template-upload"
              className="bg-white text-black rounded-xl px-6 py-3 font-semibold cursor-pointer hover:bg-gray-200 transition-all shadow-lg"
            >
              📁 Choose Template File
            </label>
          </div>
          {file && (
            <div className="text-white text-center">
              <p className="text-sm">Selected: <span className="font-semibold">{file.name}</span></p>
              <p className="text-xs text-gray-300">Size: {(file.size / 1024 / 1024).toFixed(2)} MB</p>
            </div>
          )}
          <button 
            onClick={handleUpload} 
            disabled={uploading || !file} 
            className="bg-black text-white rounded-xl px-8 py-3 font-semibold hover:bg-white hover:text-black border border-white transition-all disabled:opacity-50"
          >
            {uploading ? '📤 Uploading...' : '🚀 Upload Template'}
          </button>
        </div>
      </div>

      {/* Field Mapping Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        <div className="bg-black border border-white rounded-2xl shadow-xl p-6">
          <div className="flex items-center mb-4">
            <div className="text-2xl mr-3">🔗</div>
            <h3 className="text-xl font-bold text-white">Field Mapping</h3>
          </div>
          <FieldMapping formFields={formFields} pdfFields={pdfFields} onMap={setFieldMap} />
        </div>
        <div className="bg-black border border-white rounded-2xl shadow-xl p-6">
          <div className="flex items-center mb-4">
            <div className="text-2xl mr-3">👁️</div>
            <h3 className="text-xl font-bold text-white">Certificate Preview</h3>
          </div>
          <div className="h-48 flex items-center justify-center text-gray-300 border-2 border-dashed border-white rounded-xl mb-4">
            <div className="text-center">
              <div className="text-4xl mb-2">📄</div>
              <p>Certificate Preview</p>
              <p className="text-sm">Template will appear here</p>
            </div>
          </div>
          <div className="bg-gray-800 rounded-lg p-3">
            <p className="text-xs text-gray-300 mb-2"><strong>Field Mapping:</strong></p>
            <pre className="text-xs text-gray-400 overflow-auto max-h-20">
              {JSON.stringify(fieldMap, null, 2)}
            </pre>
          </div>
        </div>
      </div>

      {/* Certificates Table */}
      <div className="bg-black border border-white rounded-2xl shadow-xl overflow-hidden">
        <div className="p-6 border-b border-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="text-2xl mr-3">📋</div>
              <h2 className="text-xl font-bold text-white">Generated Certificates</h2>
            </div>
            <div className="text-sm text-gray-300">
              {certificates.length} certificate{certificates.length !== 1 ? 's' : ''} found
            </div>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-800">
              <tr>
                <th className="border-b border-white px-6 py-4 text-left text-white font-semibold">Certificate Name</th>
                <th className="border-b border-white px-6 py-4 text-left text-white font-semibold">Form</th>
                <th className="border-b border-white px-6 py-4 text-left text-white font-semibold">Status</th>
                <th className="border-b border-white px-6 py-4 text-left text-white font-semibold">Created</th>
                <th className="border-b border-white px-6 py-4 text-left text-white font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {certificates.length > 0 ? (
                certificates.map((cert, index) => (
                  <tr key={cert._id} className={`${index % 2 === 0 ? 'bg-gray-900' : 'bg-gray-800'} hover:bg-gray-700 transition-colors`}>
                    <td className="border-b border-white px-6 py-4 text-white">
                      <div className="flex items-center">
                        <div className="text-xl mr-3">🏆</div>
                        <div>
                          <p className="font-semibold">{cert.name || 'Untitled Certificate'}</p>
                          <p className="text-sm text-gray-400">{cert.description || 'No description'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="border-b border-white px-6 py-4 text-white">
                      {cert.formId?.title || '-'}
                    </td>
                    <td className="border-b border-white px-6 py-4">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border ${
                        cert.sent 
                          ? 'bg-white text-black border-white' 
                          : 'bg-black text-white border-white'
                      }`}>
                        {cert.sent ? '✅ Delivered' : '⏳ Pending'}
                      </span>
                    </td>
                    <td className="border-b border-white px-6 py-4 text-white">
                      {new Date(cert.createdAt).toLocaleDateString()}
                    </td>
                    <td className="border-b border-white px-6 py-4">
                      <div className="flex gap-2">
                        <button 
                          onClick={() => handleViewCertificate(cert)}
                          className="bg-black text-white rounded-lg px-3 py-1 text-xs font-semibold hover:bg-white hover:text-black border border-white transition-all"
                        >
                          👁️ View
                        </button>
                        <button 
                          onClick={() => handleDownloadCertificate(cert._id)}
                          className="bg-black text-white rounded-lg px-3 py-1 text-xs font-semibold hover:bg-white hover:text-black border border-white transition-all"
                        >
                          📥 Download
                        </button>
                        <button 
                          onClick={() => handleDeleteCertificate(cert._id)}
                          className="bg-black text-white rounded-lg px-3 py-1 text-xs font-semibold hover:bg-white hover:text-black border border-white transition-all"
                        >
                          🗑️ Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5" className="px-6 py-12 text-center">
                    <div className="text-gray-400">
                      <div className="text-4xl mb-4">🏆</div>
                      <p className="text-lg font-semibold mb-2">No certificates found</p>
                      <p className="text-sm">Create your first certificate to get started!</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Certificate Modal */}
      <Modal open={showCreateModal} onClose={() => setShowCreateModal(false)}>
        <div className="w-[600px] bg-black border border-white rounded-2xl p-8">
          <div className="flex items-center mb-6">
            <div className="text-3xl mr-3">✨</div>
            <h2 className="text-2xl font-bold text-white">Create New Certificate</h2>
          </div>
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-semibold text-white mb-2">Certificate Name</label>
              <input
                type="text"
                value={newCertificate.name}
                onChange={(e) => setNewCertificate({...newCertificate, name: e.target.value})}
                className="w-full bg-black border border-white rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-white"
                placeholder="Enter certificate name"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-white mb-2">Description</label>
              <textarea
                value={newCertificate.description}
                onChange={(e) => setNewCertificate({...newCertificate, description: e.target.value})}
                className="w-full bg-black border border-white rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-white"
                rows="3"
                placeholder="Enter certificate description"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-white mb-2">Associated Form</label>
              <select
                value={newCertificate.formId}
                onChange={(e) => setNewCertificate({...newCertificate, formId: e.target.value})}
                className="w-full bg-black border border-white rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-white"
              >
                <option value="">Select a form</option>
                {forms.map((f) => (
                  <option key={f._id} value={f._id}>{f.title}</option>
                ))}
              </select>
            </div>
            <div className="flex gap-4 pt-4">
              <button
                onClick={handleSaveCertificate}
                disabled={creating}
                className="bg-black text-white rounded-xl px-6 py-3 font-semibold hover:bg-white hover:text-black border border-white transition-all disabled:opacity-50"
              >
                {creating ? 'Creating...' : '🏆 Create Certificate'}
              </button>
              <button
                onClick={() => setShowCreateModal(false)}
                className="bg-black text-white rounded-xl px-6 py-3 font-semibold border border-white hover:bg-white hover:text-black transition-all"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      </Modal>

      {/* Certificate Preview Modal */}
      <Modal open={showPreviewModal} onClose={() => setShowPreviewModal(false)}>
        <div className="w-[700px] bg-black border border-white rounded-2xl p-8">
          <div className="flex items-center mb-6">
            <div className="text-3xl mr-3">👁️</div>
            <h2 className="text-2xl font-bold text-white">Certificate Preview</h2>
          </div>
          {selectedCertificate && (
            <div className="space-y-6">
              <div className="bg-gray-800 border border-white rounded-xl p-6">
                <div className="flex items-center mb-4">
                  <div className="text-2xl mr-3">🏆</div>
                  <h3 className="text-xl font-bold text-white">{selectedCertificate.name}</h3>
                </div>
                <p className="text-gray-300 mb-6">{selectedCertificate.description}</p>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Form:</span>
                    <span className="text-white font-semibold">{selectedCertificate.formId?.title || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Status:</span>
                    <span className={`font-semibold ${selectedCertificate.sent ? 'text-green-400' : 'text-yellow-400'}`}>
                      {selectedCertificate.sent ? '✅ Delivered' : '⏳ Pending'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Created:</span>
                    <span className="text-white font-semibold">{new Date(selectedCertificate.createdAt).toLocaleDateString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Template:</span>
                    <span className="text-white font-semibold">Default Template</span>
                  </div>
                </div>
              </div>
              <div className="flex gap-4">
                <button
                  onClick={() => handleDownloadCertificate(selectedCertificate._id)}
                  className="bg-black text-white rounded-xl px-6 py-3 font-semibold hover:bg-white hover:text-black border border-white transition-all"
                >
                  📥 Download Certificate
                </button>
                <button
                  onClick={() => setShowPreviewModal(false)}
                  className="bg-black text-white rounded-xl px-6 py-3 font-semibold border border-white hover:bg-white hover:text-black transition-all"
                >
                  Close
                </button>
              </div>
            </div>
          )}
        </div>
      </Modal>

      {toast && <Toast message={toast} onClose={() => setToast('')} />}
    </div>
  );
}