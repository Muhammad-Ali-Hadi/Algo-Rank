const API_URL = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/api`
  : 'http://localhost:5000/api';

async function fetchWithAuth(endpoint, options = {}) {
  const token = localStorage.getItem('token');

  const headers = {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
    ...options.headers,
  };

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(error.error || 'Request failed');
  }

  return response.json();
}

export const api = {
  getProfile: () => fetchWithAuth('/auth/profile'),
  updateProfile: (data) =>
    fetchWithAuth('/auth/profile', {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  healthCheck: () => fetchWithAuth('/auth/health'),

  // Contest APIs
  getContests: () => fetchWithAuth('/contests'),
  getContestById: (id) => fetchWithAuth(`/contests/${id}`),
  createGlobalContest: (data) =>
    fetchWithAuth('/contests/global', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  createLocalContest: (data) =>
    fetchWithAuth('/contests/local', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  joinContest: (id) =>
    fetchWithAuth(`/contests/${id}/join`, { method: 'POST' }),
  joinByInviteCode: (invite_code) =>
    fetchWithAuth('/contests/join-invite', {
      method: 'POST',
      body: JSON.stringify({ invite_code }),
    }),
  updateContest: (id, data) =>
    fetchWithAuth(`/contests/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  deleteContest: (id) =>
    fetchWithAuth(`/contests/${id}`, { method: 'DELETE' }),
  scrapeProblem: (url, problem_id) =>
    fetchWithAuth('/contests/scrape-problem', {
      method: 'POST',
      body: JSON.stringify({ url, problem_id }),
    }),
  submitSolution: (contestId, data) =>
    fetchWithAuth(`/contests/${contestId}/submit`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  getLeaderboard: (contestId) =>
    fetchWithAuth(`/contests/${contestId}/leaderboard`),

  // Profile APIs
  updateProfileData: (data) =>
    fetchWithAuth('/profile', {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  uploadAvatar: (avatar_base64) =>
    fetchWithAuth('/profile/avatar', {
      method: 'POST',
      body: JSON.stringify({ avatar_base64 }),
    }),
};
