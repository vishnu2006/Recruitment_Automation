import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const CandidateDashboard = ({ user, onLogout }) => {
  const [jobs, setJobs] = useState([]);
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchJobs();
    fetchApplications();
  }, []);

  const fetchJobs = async () => {
    try {
      const response = await axios.get('/jobs');
      setJobs(response.data);
    } catch (error) {
      console.error('Error fetching jobs:', error);
    }
  };

  const fetchApplications = async () => {
    try {
      const response = await axios.get('/applications');
      setApplications(response.data);
    } catch (error) {
      console.error('Error fetching applications:', error);
    } finally {
      setLoading(false);
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
        return 'status-passed';
      case 'rejected':
        return 'status-failed';
      default:
        return 'status-pending';
    }
  };

  const getStageLabel = (status) => {
    switch (status) {
      case 'applied': return 'Applied';
      case 'screening_passed': return 'Screening Passed';
      case 'mcq_passed': return 'MCQ Passed';
      case 'coding_passed': return 'Coding Passed';
      case 'interview_passed': return 'Interview Passed';
      case 'selected': return 'Selected';
      case 'offer_sent': return 'Offer Sent';
      case 'rejected': return 'Rejected';
      default: return 'In Progress';
    }
  };

  const getNextAction = (application) => {
    switch (application.status) {
      case 'screening_passed':
        return { text: 'Start MCQ Round', action: () => navigate(`/assessment/${application.id}`) };
      case 'mcq_passed':
        return { text: 'Start Coding Round', action: () => navigate(`/assessment/${application.id}`) };
      case 'coding_passed':
        return { text: 'Start Interview', action: () => navigate(`/assessment/${application.id}`) };
      case 'interview_passed':
        return { text: 'Passed Interview', action: null };
      case 'selected':
        return { text: 'Selected for Offer', action: null };
      case 'offer_sent':
        return { text: 'Offer Sent', action: null };
      case 'rejected':
        return { text: 'Application Rejected', action: null };
      default:
        return { text: 'AI Screening in Progress', action: null };
    }
  };

  const getProgressPercentage = (application) => {
    const stages = ['applied', 'screening_passed', 'mcq_passed', 'coding_passed', 'interview_passed'];
    const currentIndex = stages.indexOf(application.status);
    return currentIndex >= 0 ? ((currentIndex + 1) / stages.length * 100) : 0;
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
            <h1 className="text-2xl font-bold text-gray-800">Candidate Dashboard</h1>
            <div className="flex items-center space-x-4">
              <span className="text-gray-600">Welcome, {user.email}</span>
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
        {/* My Applications */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-white mb-4">My Applications</h2>
          {applications.length === 0 ? (
            <div className="card text-center py-8">
              <p className="text-gray-500">No applications yet</p>
            </div>
          ) : (
            <div className="grid gap-4">
              {applications.map((app) => {
                const nextAction = getNextAction(app);
                const progressPercentage = getProgressPercentage(app);
                
                return (
                  <div key={app.id} className="card">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="font-semibold text-gray-800">
                          {app.job_title || 'Job Application'}
                        </h3>
                        <p className="text-sm text-gray-600">
                          Applied: {new Date(app.applied_at).toLocaleDateString()}
                        </p>
                        {app.screening_score && (
                          <p className="text-sm text-gray-500">
                            Screening Score: {app.screening_score}/100
                          </p>
                        )}
                      </div>
                      <div className="flex items-center space-x-4">
                        <span className={`status-badge ${getStatusColor(app.status)}`}>
                          {getStageLabel(app.status)}
                        </span>
                        {nextAction.action && (
                          <button
                            onClick={nextAction.action}
                            className="btn btn-primary text-sm"
                          >
                            {nextAction.text}
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="mb-4">
                      <div className="flex justify-between text-sm text-gray-600 mb-2">
                        <span>Application Progress</span>
                        <span>{Math.round(progressPercentage)}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-primary-600 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${progressPercentage}%` }}
                        />
                      </div>
                    </div>

                    {/* Stage Indicators */}
                    <div className="flex space-x-2 text-xs">
                      {['applied', 'screening_passed', 'mcq_passed', 'coding_passed', 'interview_passed'].map((stage, index) => {
                        const isCompleted = ['applied', 'screening_passed', 'mcq_passed', 'coding_passed', 'interview_passed']
                          .slice(0, ['applied', 'screening_passed', 'mcq_passed', 'coding_passed', 'interview_passed'].indexOf(app.status) + 1)
                          .includes(stage);
                        
                        return (
                          <div key={stage} className={`w-8 h-8 rounded-full flex items-center justify-center ${
                            isCompleted ? 'bg-green-500' : 'bg-gray-300'
                          }`}>
                            <span className={`text-white font-medium ${isCompleted ? '' : 'text-gray-500'}`}>
                              {index + 1}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Available Jobs */}
        <div>
          <h2 className="text-xl font-semibold text-white mb-4">Available Jobs</h2>
          {jobs.length === 0 ? (
            <div className="card text-center py-8">
              <p className="text-gray-500">No jobs available at the moment</p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {jobs.map((job) => (
                <div key={job.id} className="card">
                  <h3 className="text-lg font-semibold text-gray-800 mb-2">{job.title}</h3>
                  <div className="space-y-2 text-sm text-gray-600 mb-4">
                    <p><span className="font-medium">Location:</span> {job.location}</p>
                    <p><span className="font-medium">Mode:</span> {job.work_mode}</p>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {job.required_skills.slice(0, 3).map((skill, index) => (
                        <span key={index} className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs">
                          {skill}
                        </span>
                      ))}
                      {job.required_skills.length > 3 && (
                        <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs">
                          +{job.required_skills.length - 3} more
                        </span>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => navigate(`/apply/${job.id}`)}
                    className="w-full btn btn-primary"
                  >
                    Apply Now
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CandidateDashboard;
