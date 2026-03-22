import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';

const Register = ({ onLogin }) => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    role: 'candidate',
    github_username: '',
    leetcode_username: '',
    linkedin_url: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    try {
      await axios.post('/register', {
        email: formData.email,
        password: formData.password,
        role: formData.role,
        github_username: formData.github_username || undefined,
        leetcode_username: formData.leetcode_username || undefined,
        linkedin_url: formData.linkedin_url || undefined
      });

      // Auto login after registration
      const loginResponse = await axios.post('/token',
        new URLSearchParams({
          username: formData.email,
          password: formData.password
        }),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          }
        }
      );

      onLogin(loginResponse.data.access_token, {
        email: loginResponse.data.email,
        role: loginResponse.data.role
      });
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.detail || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-8">
      <div className="max-w-md w-full">
        <div className="card">
          <h2 className="text-3xl font-bold text-center mb-8 text-gray-800">
            AI Recruitment Platform
          </h2>
          <h3 className="text-xl font-semibold text-center mb-6 text-gray-600">
            Create Account
          </h3>
          
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </label>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Confirm Password
              </label>
              <input
                type="password"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Role
              </label>
              <select
                name="role"
                value={formData.role}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="candidate">Candidate</option>
                <option value="hr">HR</option>
              </select>
            </div>

            {formData.role === 'candidate' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    GitHub Username (Optional)
                  </label>
                  <input
                    type="text"
                    name="github_username"
                    value={formData.github_username}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    LeetCode Username (Optional)
                  </label>
                  <input
                    type="text"
                    name="leetcode_username"
                    value={formData.leetcode_username}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    LinkedIn URL (Optional)
                  </label>
                  <input
                    type="url"
                    name="linkedin_url"
                    value={formData.linkedin_url}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
              </>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full btn btn-primary disabled:opacity-50"
            >
              {loading ? 'Creating Account...' : 'Sign Up'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-gray-600">
              Already have an account?{' '}
              <Link to="/login" className="text-primary-600 hover:text-primary-800">
                Sign In
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;
