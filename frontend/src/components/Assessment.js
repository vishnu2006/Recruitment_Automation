import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';

const Assessment = ({ user }) => {
  const [application, setApplication] = useState(null);
  const [assessments, setAssessments] = useState([]);
  const [currentRound, setCurrentRound] = useState(null);
  const [answers, setAnswers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const { applicationId } = useParams();
  const navigate = useNavigate();

  useEffect(() => {
    fetchAssessments();
  }, [applicationId]);

  const fetchAssessments = async () => {
    try {
      // First get the application details
      const appResponse = await axios.get(`/applications`);
      const application = appResponse.data.find(app => app.id === applicationId);
      
      if (!application) {
        setError('Application not found');
        return;
      }

      setApplication(application);
      
      // Determine which round to start based on application status
      if (application.status === 'screening_passed') {
        setCurrentRound({ round_number: 2, round_type: 'mcq' });
      } else if (application.status === 'mcq_passed') {
        setCurrentRound({ round_number: 3, round_type: 'coding' });
      } else if (application.status === 'coding_passed') {
        setCurrentRound({ round_number: 4, round_type: 'interview' });
      } else if (application.status === 'applied') {
        // Still screening
        setCurrentRound(null);
      } else {
        // Completed or rejected
        setCurrentRound(null);
      }
      
      const response = await axios.get(`/applications/${applicationId}/assessments`);
      setAssessments(response.data);
      
    } catch (error) {
      console.error('Error fetching assessments:', error);
      setError('Failed to load assessments');
    } finally {
      setLoading(false);
    }
  };

  const generateNextRound = async (roundNumber) => {
    try {
      const response = await axios.post(`/assessments/${applicationId}/next-round`);
      setCurrentRound({
        round_number: roundNumber,
        ...response.data
      });
      setAnswers(new Array(roundNumber === 2 ? 5 : roundNumber === 3 ? 1 : 2).fill(''));
    } catch (error) {
      console.error('Error generating next round:', error);
      setError('Failed to generate assessment');
    }
  };

  const startCurrentRound = async () => {
    try {
      setLoading(true);
      const roundType = currentRound.round_type;
      const response = await axios.post(`/assessments/${applicationId}/start-${roundType}`);
      
      // Navigate to the step assessment component
      navigate(`/assessment/${applicationId}/${roundType}`);
    } catch (error) {
      console.error('Error starting round:', error);
      setError(error.response?.data?.detail || 'Failed to start round');
    } finally {
      setLoading(false);
    }
  };

  const handleAnswerChange = (index, value) => {
    const newAnswers = [...answers];
    newAnswers[index] = value;
    setAnswers(newAnswers);
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setError('');

    try {
      const response = await axios.post(`/assessments/${currentRound.assessment_id}/submit`, {
        answers: answers
      });

      // Refresh assessments
      fetchAssessments();
    } catch (error) {
      setError(error.response?.data?.detail || 'Failed to submit assessment');
    } finally {
      setSubmitting(false);
    }
  };

  const getRoundTitle = (roundNumber) => {
    switch (roundNumber) {
      case 1: return 'AI Resume Scoring';
      case 2: return 'MCQ Assessment';
      case 3: return 'Coding Challenge';
      case 4: return 'AI Interview';
      default: return 'Assessment';
    }
  };

  const getStatusColor = (passed) => {
    return passed ? 'status-passed' : 'status-failed';
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-white text-xl">Loading assessment...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <h1 className="text-2xl font-bold text-gray-800">Assessment Center</h1>
            <button
              onClick={() => navigate('/dashboard')}
              className="btn btn-secondary"
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Progress */}
        <div className="card mb-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Assessment Progress</h2>
          <div className="flex items-center justify-between mb-4">
            {[1, 2, 3, 4].map((round) => {
              const assessment = assessments.find(a => a.round_number === round);
              const isCompleted = assessment && assessment.completed_at;
              const isCurrent = currentRound && currentRound.round_number === round;
              
              return (
                <div key={round} className="flex flex-col items-center">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                    isCompleted 
                      ? assessment.passed ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
                      : isCurrent ? 'bg-primary-500 text-white' : 'bg-gray-300 text-gray-600'
                  }`}>
                    {isCompleted ? (assessment.passed ? '✓' : '✗') : round}
                  </div>
                  <span className="text-xs mt-2 text-gray-600">
                    {getRoundTitle(round)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Completed Rounds */}
        {assessments.length > 0 && (
          <div className="card mb-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Completed Rounds</h3>
            <div className="space-y-3">
              {assessments.filter(a => a.completed_at).map((assessment) => (
                <div key={assessment.id} className="border-l-4 border-gray-200 pl-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <h4 className="font-medium text-gray-800">
                        Round {assessment.round_number}: {getRoundTitle(assessment.round_number)}
                      </h4>
                      {assessment.score !== undefined && (
                        <p className="text-sm text-gray-600">Score: {assessment.score}/100</p>
                      )}
                      {assessment.feedback && (
                        <p className="text-sm text-gray-600 mt-1">{assessment.feedback}</p>
                      )}
                    </div>
                    <span className={`status-badge ${getStatusColor(assessment.passed)}`}>
                      {assessment.passed ? 'Passed' : 'Failed'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Current Round */}
        {currentRound ? (
          <div className="card">
            <h3 className="text-xl font-semibold text-gray-800 mb-4">
              Round {currentRound.round_number}: {getRoundTitle(currentRound.round_number)}
            </h3>
            
            <p className="text-gray-600 mb-6">
              Ready to start the next round? Click below to begin your assessment.
            </p>

            <button
              onClick={() => startCurrentRound()}
              disabled={loading}
              className="w-full btn btn-primary disabled:opacity-50"
            >
              {loading ? 'Starting...' : 'Start Round'}
            </button>
          </div>
        ) : (
          <div className="card text-center">
            {application?.status === 'applied' ? (
              <div>
                <div className="text-yellow-600 text-6xl mb-4">⏳</div>
                <h2 className="text-2xl font-bold text-gray-800 mb-2">AI Screening in Progress</h2>
                <p className="text-gray-600">Your resume is being analyzed. Please check back later.</p>
              </div>
            ) : assessments.some(a => !a.passed && a.completed_at) ? (
              <div>
                <div className="text-red-600 text-6xl mb-4">✗</div>
                <h2 className="text-2xl font-bold text-gray-800 mb-2">Assessment Failed</h2>
                <p className="text-gray-600">Unfortunately, you didn't pass one of the assessment rounds.</p>
                <button
                  onClick={() => navigate('/dashboard')}
                  className="btn btn-primary mt-4"
                >
                  Back to Dashboard
                </button>
              </div>
            ) : (
              <div>
                <div className="text-green-600 text-6xl mb-4">✓</div>
                <h2 className="text-2xl font-bold text-gray-800 mb-2">Assessment Completed!</h2>
                <p className="text-gray-600">You have completed all assessment rounds.</p>
                <button
                  onClick={() => navigate('/dashboard')}
                  className="btn btn-primary mt-4"
                >
                  Back to Dashboard
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Assessment;
