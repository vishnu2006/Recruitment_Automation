import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const EnhancedHRDashboard = ({ user, onLogout }) => {
  const [jobs, setJobs] = useState([]);
  const [selectedJob, setSelectedJob] = useState(null);
  const [applicants, setApplicants] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showJobForm, setShowJobForm] = useState(false);
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
      if (response.data.length > 0 && !selectedJob) {
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

  const handleJobSubmit = async (jobData) => {
    try {
      await axios.post('/jobs', jobData);
      setShowJobForm(false);
      fetchJobs();
    } catch (error) {
      console.error('Error creating job:', error);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'screening_passed':
      case 'mcq_passed':
      case 'coding_passed':
      case 'interview_passed':
      case 'selected':
      case 'offer_sent':
        return 'bg-green-100 text-green-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-yellow-100 text-yellow-800';
    }
  };

  const getFinalQualifiedCandidates = () => {
    if (!applicants) return [];
    return applicants.all_applicants?.filter(app => app.status === 'interview_passed')
      .sort((a, b) => (b.final_css_score || 0) - (a.final_css_score || 0))
      .slice(0, 5) || [];
  };

  const handleSelectCandidate = async (applicationId) => {
    try {
      await axios.post(`/applications/${applicationId}/select`);
      fetchApplicants(selectedJob.id);
    } catch (error) {
      console.error('Error selecting candidate:', error);
    }
  };

  const handleSendOffer = async (applicationId) => {
    try {
      await axios.post(`/applications/${applicationId}/send-offer`);
      fetchApplicants(selectedJob.id);
    } catch (error) {
      console.error('Error sending offer:', error);
    }
  };

  const handleRejectCandidate = async (applicationId) => {
    try {
      await axios.post(`/applications/${applicationId}/reject`);
      fetchApplicants(selectedJob.id);
    } catch (error) {
      console.error('Error rejecting candidate:', error);
    }
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

      {showJobForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="card max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">Post New Job</h2>
            <form onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.target);
              handleJobSubmit({
                title: formData.get('title'),
                location: formData.get('location'),
                work_mode: formData.get('work_mode'),
                job_description: formData.get('job_description'),
                required_skills: formData.get('required_skills').split(',').map(s => s.trim()).filter(s => s)
              });
            }} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Job Title</label>
                <input name="title" type="text" required className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Location</label>
                <input name="location" type="text" required className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Work Mode</label>
                <select name="work_mode" className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500">
                  <option value="Remote">Remote</option>
                  <option value="On-site">On-site</option>
                  <option value="Hybrid">Hybrid</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Required Skills (comma-separated)</label>
                <input name="required_skills" type="text" required placeholder="e.g., Python, React, AWS" className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Job Description</label>
                <textarea name="job_description" rows={6} required className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500" />
              </div>
              <div className="flex space-x-4">
                <button type="submit" className="btn btn-primary">Post Job</button>
                <button type="button" onClick={() => setShowJobForm(false)} className="btn btn-secondary">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid lg:grid-cols-3 gap-8">
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
                  <div className="text-xs text-gray-400 mt-2">
                    Posted: {new Date(job.posted_at).toLocaleDateString()}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="lg:col-span-2">
            {selectedJob ? (
              <>
                <h2 className="text-xl font-semibold text-white mb-4">
                  Applicants for {selectedJob.title}
                </h2>
                
                {applicants ? (
                  <>
                    <div className="grid grid-cols-4 gap-4 mb-6">
                      <div className="card text-center">
                        <div className="text-2xl font-bold text-gray-800">{applicants.total_applicants || 0}</div>
                        <div className="text-sm text-gray-600">Total Applicants</div>
                      </div>
                      <div className="card text-center">
                        <div className="text-2xl font-bold text-gray-800">{applicants.screening?.length || 0}</div>
                        <div className="text-sm text-gray-600">Screening</div>
                      </div>
                      <div className="card text-center">
                        <div className="text-2xl font-bold text-gray-800">{applicants.mcq?.length || 0}</div>
                        <div className="text-sm text-gray-600">MCQ</div>
                      </div>
                      <div className="card text-center">
                        <div className="text-2xl font-bold text-gray-800">{applicants.coding?.length || 0}</div>
                        <div className="text-sm text-gray-600">Coding</div>
                      </div>
                      <div className="card text-center">
                        <div className="text-2xl font-bold text-gray-800">{applicants.interview?.length || 0}</div>
                        <div className="text-sm text-gray-600">Interview</div>
                      </div>
                    </div>

                    <div className="mt-8">
                      <h3 className="text-lg font-semibold text-white mb-4">Final Qualified Candidates</h3>
                      <div className="space-y-3">
                        {getFinalQualifiedCandidates().map((candidate, index) => (
                          <div key={candidate.id} className="card">
                            <div className="flex justify-between items-start mb-4">
                              <div>
                                <h4 className="font-semibold text-gray-800">
                                  {candidate.candidate_name} ({candidate.candidate_email})
                                </h4>
                                <div className="text-sm text-gray-600 space-y-1">
                                  <div>Final CSS Score: {candidate.final_css_score || 'N/A'}</div>
                                  <div>Screening: {candidate.screening_score || 'N/A'}</div>
                                  <div>MCQ: {candidate.mcq_score || 'N/A'}</div>
                                  <div>Coding: {candidate.coding_score || 'N/A'}</div>
                                  <div>Interview: {candidate.interview_score || 'N/A'}</div>
                                </div>
                              </div>
                              <div className="flex space-x-2">
                                {candidate.status === 'selected' ? (
                                  <span className="status-badge bg-green-100 text-green-800">Selected</span>
                                ) : candidate.status === 'offer_sent' ? (
                                  <span className="status-badge bg-blue-100 text-blue-800">Offer Sent</span>
                                ) : (
                                  <button
                                    onClick={() => handleSelectCandidate(candidate.id)}
                                    className="btn btn-primary text-sm"
                                  >
                                    Select Candidate
                                  </button>
                                )}
                                {candidate.status === 'selected' && (
                                  <button
                                    onClick={() => handleSendOffer(candidate.id)}
                                    className="btn btn-secondary text-sm"
                                  >
                                    Send Offer
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="mt-8">
                      <h3 className="text-lg font-semibold text-white mb-4">All Applicants</h3>
                      <div className="card overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Candidate</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Score</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Stage</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {applicants.all_applicants?.map((applicant) => (
                              <tr key={applicant.id}>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{applicant.candidate_name}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{applicant.candidate_email}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{applicant.score}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{applicant.stage}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{applicant.status}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                  <button
                                    onClick={() => handleSelectCandidate(applicant.id)}
                                    className="btn btn-primary text-sm"
                                  >
                                    Select Candidate
                                  </button>
                                  <button
                                    onClick={() => handleRejectCandidate(applicant.id)}
                                    className="btn btn-secondary text-sm"
                                  >
                                    Reject Candidate
                                  </button>
                                  <button
                                    onClick={() => handleSendOffer(applicant.id)}
                                    className="btn btn-secondary text-sm"
                                  >
                                    Send Offer
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="card text-center py-8">
                    <p className="text-gray-500">No applicants found</p>
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

export default EnhancedHRDashboard;
