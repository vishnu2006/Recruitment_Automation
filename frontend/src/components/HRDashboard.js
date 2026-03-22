import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const HRDashboard = ({ user, onLogout }) => {
  const [jobs, setJobs] = useState([]);
  const [selectedJob, setSelectedJob] = useState(null);
  const [applicants, setApplicants] = useState([]);
  const [showJobForm, setShowJobForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [jobForm, setJobForm] = useState({
    title: '',
    location: '',
    work_mode: 'Remote',
    job_description: '',
    required_skills: ''
  });
  const navigate = useNavigate();

  useEffect(() => {
    fetchJobs();
  }, []);

  useEffect(() => {
    if (selectedJob) {
      fetchApplicants(selectedJob.id);
    }
  }, [selectedJob]);

  const fetchJobs = async () => {
    try {
      const response = await axios.get('/jobs');
      setJobs(response.data);
      if (response.data.length > 0) {
        setSelectedJob(response.data[0]);
      }
    } catch (error) {
      console.error('Error fetching jobs:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchApplicants = async (jobId) => {
    try {
      const response = await axios.get(`/jobs/${jobId}/applicants`);
      setApplicants(response.data);
    } catch (error) {
      console.error('Error fetching applicants:', error);
    }
  };

  const handleJobFormChange = (e) => {
    setJobForm({
      ...jobForm,
      [e.target.name]: e.target.value
    });
  };

  const handleJobSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post('/jobs', {
        ...jobForm,
        required_skills: jobForm.required_skills.split(',').map(s => s.trim()).filter(s => s)
      });
      setShowJobForm(false);
      setJobForm({
        title: '',
        location: '',
        work_mode: 'Remote',
        job_description: '',
        required_skills: ''
      });
      fetchJobs();
    } catch (error) {
      console.error('Error creating job:', error);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':
        return 'status-passed';
      case 'rejected':
        return 'status-failed';
      default:
        return 'status-pending';
    }
  };

  const getApplicationStatus = (application) => {
    if (application.status === 'completed') return 'Completed';
    if (application.status === 'rejected') return 'Rejected';
    if (application.status.includes('round')) {
      const round = application.status.split('_')[0];
      return `${round.charAt(0).toUpperCase() + round.slice(1)} In Progress`;
    }
    return 'Pending';
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-white text-xl">Loading dashboard...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <h1 className="text-2xl font-bold text-gray-800">HR Dashboard</h1>
            <div className="flex items-center space-x-4">
              <span className="text-gray-600">Welcome, {user.email}</span>
              <button
                onClick={() => setShowJobForm(true)}
                className="btn btn-primary"
              >
                Post New Job
              </button>
              <button
                onClick={onLogout}
                className="btn btn-secondary"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Job Form Modal */}
        {showJobForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="card max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <h2 className="text-2xl font-bold text-gray-800 mb-6">Post New Job</h2>
              <form onSubmit={handleJobSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Job Title
                  </label>
                  <input
                    type="text"
                    name="title"
                    value={jobForm.title}
                    onChange={handleJobFormChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Location
                  </label>
                  <input
                    type="text"
                    name="location"
                    value={jobForm.location}
                    onChange={handleJobFormChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Work Mode
                  </label>
                  <select
                    name="work_mode"
                    value={jobForm.work_mode}
                    onChange={handleJobFormChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="Remote">Remote</option>
                    <option value="On-site">On-site</option>
                    <option value="Hybrid">Hybrid</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Required Skills (comma-separated)
                  </label>
                  <input
                    type="text"
                    name="required_skills"
                    value={jobForm.required_skills}
                    onChange={handleJobFormChange}
                    placeholder="e.g., Python, React, AWS"
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Job Description
                  </label>
                  <textarea
                    name="job_description"
                    value={jobForm.job_description}
                    onChange={handleJobFormChange}
                    rows={6}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>

                <div className="flex space-x-4">
                  <button
                    type="submit"
                    className="btn btn-primary"
                  >
                    Post Job
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowJobForm(false)}
                    className="btn btn-secondary"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Jobs List */}
          <div className="lg:col-span-1">
            <h2 className="text-xl font-semibold text-white mb-4">Posted Jobs</h2>
            <div className="space-y-3">
              {jobs.map((job) => (
                <div
                  key={job.id}
                  onClick={() => setSelectedJob(job)}
                  className={`card cursor-pointer transition-all ${
                    selectedJob?.id === job.id ? 'ring-2 ring-primary-500' : ''
                  }`}
                >
                  <h3 className="font-semibold text-gray-800">{job.title}</h3>
                  <p className="text-sm text-gray-600">{job.location}</p>
                  <p className="text-sm text-gray-500">{job.work_mode}</p>
                  <div className="mt-2">
                    <span className="text-xs text-gray-500">
                      Posted: {new Date(job.posted_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Applicants */}
          <div className="lg:col-span-2">
            {selectedJob ? (
              <>
                <h2 className="text-xl font-semibold text-white mb-4">
                  Applicants for {selectedJob.title}
                </h2>
                {applicants.length === 0 ? (
                  <div className="card text-center py-8">
                    <p className="text-gray-500">No applicants yet</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {applicants.map((applicant) => (
                      <div key={applicant.id} className="card">
                        <div className="flex justify-between items-start mb-4">
                          <div>
                            <h3 className="font-semibold text-gray-800">
                              {applicant.candidate_email}
                            </h3>
                            <p className="text-sm text-gray-600">
                              Applied: {new Date(applicant.applied_at).toLocaleDateString()}
                            </p>
                            {applicant.ai_score && (
                              <p className="text-sm text-gray-500">
                                AI Score: {applicant.ai_score}/100
                              </p>
                            )}
                          </div>
                          <span className={`status-badge ${getStatusColor(applicant.status)}`}>
                            {getApplicationStatus(applicant)}
                          </span>
                        </div>
                        <button
                          onClick={() => navigate(`/assessment/${applicant.id}`)}
                          className="btn btn-secondary"
                        >
                          View Assessment Details
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <div className="card text-center py-8">
                <p className="text-gray-500">Select a job to view applicants</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default HRDashboard;
