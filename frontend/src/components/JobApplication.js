import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';

const JobApplication = ({ user }) => {
  const [job, setJob] = useState(null);
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [extractedText, setExtractedText] = useState('');
  const { jobId } = useParams();
  const navigate = useNavigate();

  useEffect(() => {
    fetchJob();
  }, [jobId]);

  const fetchJob = async () => {
    try {
      const response = await axios.get('/jobs');
      const jobData = response.data.find(j => j.id === jobId);
      setJob(jobData);
    } catch (error) {
      console.error('Error fetching job:', error);
      setError('Failed to load job details');
    }
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      if (selectedFile.type === 'application/pdf') {
        if (selectedFile.size > 10 * 1024 * 1024) {
          setError('File size exceeds 10MB limit');
          setFile(null);
        } else {
          setFile(selectedFile);
          setError('');
        }
      } else {
        setError('Please select a PDF file');
        setFile(null);
      }
    }
  };

  const showToast = (message, type = 'success') => {
    // Create toast element
    const toast = document.createElement('div');
    toast.className = `fixed top-4 right-4 px-6 py-3 rounded-lg shadow-lg z-50 transform transition-all duration-300 ${
      type === 'success' 
        ? 'bg-green-500 text-white' 
        : 'bg-red-500 text-white'
    }`;
    toast.textContent = message;
    
    document.body.appendChild(toast);
    
    // Animate in
    setTimeout(() => {
      toast.style.transform = 'translateX(0)';
    }, 100);
    
    // Remove after 3 seconds
    setTimeout(() => {
      toast.style.transform = 'translateX(400px)';
      setTimeout(() => {
        document.body.removeChild(toast);
      }, 300);
    }, 3000);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) {
      setError('Please select a resume file');
      return;
    }

    setUploading(true);
    setError('');

    const formData = new FormData();
    formData.append('file', file);
    formData.append('job_id', jobId);

    try {
      const response = await axios.post('/upload-resume', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (progressEvent) => {
          const progress = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total
          );
          console.log(`Upload progress: ${progress}%`);
        },
      });

      setExtractedText(response.data.extracted_text || '');
      showToast('Resume uploaded successfully! AI scoring initiated...', 'success');
      
      setTimeout(() => {
        navigate('/dashboard');
      }, 2000);
    } catch (error) {
      const errorMessage = error.response?.data?.detail || 'Failed to upload resume';
      setError(errorMessage);
      showToast(errorMessage, 'error');
      console.error('Upload error:', error);
    } finally {
      setUploading(false);
    }
  };

  if (!job) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-white text-xl">Loading job details...</div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="card text-center">
          <div className="text-green-600 text-6xl mb-4">✓</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Resume Uploaded Successfully!</h2>
          <p className="text-gray-600">Redirecting to assessment...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <h1 className="text-2xl font-bold text-gray-800">Apply for Position</h1>
            <button
              onClick={() => navigate('/dashboard')}
              className="btn btn-secondary"
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="card mb-6">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">{job.title}</h2>
          <div className="grid md:grid-cols-2 gap-4 mb-4">
            <div>
              <span className="font-medium text-gray-700">Location:</span>
              <span className="ml-2 text-gray-600">{job.location}</span>
            </div>
            <div>
              <span className="font-medium text-gray-700">Work Mode:</span>
              <span className="ml-2 text-gray-600">{job.work_mode}</span>
            </div>
          </div>
          
          <div className="mb-4">
            <h3 className="font-medium text-gray-700 mb-2">Required Skills:</h3>
            <div className="flex flex-wrap gap-2">
              {job.required_skills.map((skill, index) => (
                <span key={index} className="px-3 py-1 bg-primary-100 text-primary-800 rounded-full text-sm">
                  {skill}
                </span>
              ))}
            </div>
          </div>

          <div>
            <h3 className="font-medium text-gray-700 mb-2">Job Description:</h3>
            <p className="text-gray-600 whitespace-pre-line">{job.job_description}</p>
          </div>
        </div>

        <div className="card">
          <h3 className="text-xl font-semibold text-gray-800 mb-4">Upload Resume</h3>
          
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Resume (PDF only)
              </label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                <input
                  type="file"
                  accept=".pdf"
                  onChange={handleFileChange}
                  className="hidden"
                  id="resume-upload"
                />
                <label htmlFor="resume-upload" className="cursor-pointer">
                  {file ? (
                    <div>
                      <div className="text-green-600 text-4xl mb-2">📄</div>
                      <p className="text-gray-800 font-medium">{file.name}</p>
                      <p className="text-gray-500 text-sm">Click to change file</p>
                    </div>
                  ) : (
                    <div>
                      <div className="text-gray-400 text-4xl mb-2">📁</div>
                      <p className="text-gray-800 font-medium">Click to upload resume</p>
                      <p className="text-gray-500 text-sm">PDF files only</p>
                    </div>
                  )}
                </label>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-medium text-blue-800 mb-2">What happens next?</h4>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>• AI will analyze your resume and score your suitability</li>
                <li>• If you pass, you'll proceed to MCQ assessment</li>
                <li>• Followed by coding challenge and AI interview</li>
                <li>• Each round unlocks sequentially</li>
              </ul>
            </div>

            <button
              type="submit"
              disabled={uploading || !file}
              className="w-full btn btn-primary disabled:opacity-50"
            >
              {uploading ? 'Uploading and Analyzing...' : 'Submit Application'}
            </button>
          </form>

          {extractedText && (
            <div className="mt-6 p-4 bg-gray-50 rounded-lg">
              <h4 className="font-medium text-gray-700 mb-2">Extracted Text Preview:</h4>
              <div className="text-sm text-gray-600 max-h-32 overflow-y-auto">
                {extractedText}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default JobApplication;
