import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';

const StepAssessment = ({ user }) => {
  const { applicationId, round } = useParams();
  const navigate = useNavigate();
  
  const [application, setApplication] = useState(null);
  const [assessment, setAssessment] = useState(null);
  const [answers, setAnswers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchApplication();
  }, [applicationId]);

  const fetchApplication = async () => {
    try {
      const response = await axios.get(`/applications`);
      const app = response.data.find(a => a.id === applicationId);
      setApplication(app);
    } catch (error) {
      console.error('Error fetching application:', error);
      setError('Failed to load application');
    } finally {
      setLoading(false);
    }
  };

  const startAssessment = async () => {
    try {
      setLoading(true);
      const response = await axios.post(`/assessments/${applicationId}/start-${round}`);
      setAssessment(response.data);
      setAnswers(new Array(response.data.questions.length).fill(''));
      setError('');
    } catch (error) {
      console.error('Error starting assessment:', error);
      setError(error.response?.data?.detail || 'Failed to start assessment');
    } finally {
      setLoading(false);
    }
  };

  const handleAnswerChange = (index, value) => {
    const newAnswers = [...answers];
    newAnswers[index] = value;
    setAnswers(newAnswers);
  };

  const submitAssessment = async () => {
    if (answers.some(a => !a.trim())) {
      setError('Please answer all questions');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const response = await axios.post(`/assessments/${assessment.id}/submit-${round}`, {
        answers: answers
      });

      if (response.data.passed) {
        // Show success and navigate to next round or completion
        setTimeout(() => {
          if (round === 'interview') {
            navigate('/dashboard');
          } else {
            const nextRound = round === 'mcq' ? 'coding' : round === 'coding' ? 'interview' : null;
            if (nextRound) {
              navigate(`/assessment/${applicationId}/${nextRound}`);
            } else {
              navigate('/dashboard');
            }
          }
        }, 2000);
      } else {
        setError(`Assessment failed: ${response.data.feedback}`);
      }
    } catch (error) {
      setError(error.response?.data?.detail || 'Failed to submit assessment');
    } finally {
      setSubmitting(false);
    }
  };

  const getRoundTitle = () => {
    switch (round) {
      case 'mcq': return 'MCQ Assessment';
      case 'coding': return 'Coding Challenge';
      case 'interview': return 'AI Interview';
      default: return 'Assessment';
    }
  };

  const renderQuestion = (question, index) => {
    if (round === 'mcq') {
      return (
        <div key={index} className="border rounded-lg p-4 mb-4">
          <div className="whitespace-pre-line text-gray-800 mb-3">
            {question}
          </div>
          <select
            value={answers[index] || ''}
            onChange={(e) => handleAnswerChange(index, e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="">Select an answer</option>
            <option value="A">A</option>
            <option value="B">B</option>
            <option value="C">C</option>
            <option value="D">D</option>
          </select>
        </div>
      );
    } else {
      return (
        <div key={index} className="border rounded-lg p-4 mb-4">
          <div className="whitespace-pre-line text-gray-800 mb-3">
            {question}
          </div>
          <textarea
            value={answers[index] || ''}
            onChange={(e) => handleAnswerChange(index, e.target.value)}
            rows={8}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 font-mono text-sm"
            placeholder="Type your answer here..."
          />
        </div>
      );
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-white text-xl">Loading assessment...</div>
      </div>
    );
  }

  if (!application) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-white text-xl">Application not found</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <h1 className="text-2xl font-bold text-gray-800">
              {getRoundTitle()}
            </h1>
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
        {!assessment ? (
          <div className="card text-center">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">
              Ready to start {getRoundTitle()}
            </h2>
            <p className="text-gray-600 mb-6">
              This round will test your skills for the position. Take your time and answer carefully.
            </p>
            <button
              onClick={startAssessment}
              disabled={loading}
              className="btn btn-primary"
            >
              {loading ? 'Starting...' : 'Start Assessment'}
            </button>
          </div>
        ) : (
          <div>
            <div className="card mb-6">
              <h2 className="text-2xl font-bold text-gray-800 mb-4">
                {getRoundTitle()}
              </h2>
              
              {error && (
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                  {error}
                </div>
              )}

              <div className="space-y-4">
                {assessment.questions.map((question, index) => renderQuestion(question, index))}
              </div>

              <button
                onClick={submitAssessment}
                disabled={submitting || answers.some(a => !a.trim())}
                className="w-full btn btn-primary disabled:opacity-50"
              >
                {submitting ? 'Submitting...' : 'Submit Assessment'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default StepAssessment;
