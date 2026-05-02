const API_URL = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/api`
  : 'http://localhost:5000/api';

const cache = new Map();
const abortControllers = new Map(); // Store tokens for active requests

async function fetchWithAuth(endpoint, options = {}) {
  const token = localStorage.getItem('token');
  const isGet = !options.method || options.method === 'GET';

  // Return cached data if valid (5 seconds TTL)
  if (isGet) {
    const cached = cache.get(endpoint);
    if (cached && Date.now() - cached.timestamp < 5000) {
      return cached.data;
    }

    // Cancel any rapidly preceding identical requests
    if (abortControllers.has(endpoint)) {
      abortControllers.get(endpoint).abort();
    }
  }

  const controller = new AbortController();
  if (isGet) {
    abortControllers.set(endpoint, controller);
  }

  const headers = {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
    ...options.headers,
  };

  try {
    const response = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers,
      signal: isGet ? controller.signal : undefined,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Request failed' }));
      throw new Error(error.error || 'Request failed');
    }

    const data = await response.json();

    if (isGet) {
      cache.set(endpoint, { timestamp: Date.now(), data });
      abortControllers.delete(endpoint);
    }

    return data;
  } catch (err) {
    if (err.name === 'AbortError') {
      // Swallowing the abort exception ensures the UI doesn't visually crash
      // or mistakenly jump into the finally / error handling phase
      return new Promise(() => {});
    }
    throw err;
  }
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
  getContestById: (id, includeProblemsContent = false) => fetchWithAuth(`/contests/${id}${includeProblemsContent ? '?includeProblemsContent=true' : ''}`),
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
  compileSolution: (data) =>
    fetchWithAuth('/contests/compile', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  getSubmissionStatus: (subId) =>
    fetchWithAuth(`/contests/submissions/${subId}`),
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
  removeAvatar: () =>
    fetchWithAuth('/profile/avatar', {
      method: 'DELETE',
    }),

  // Problem APIs
  getProblems: (page = 1, limit = 20) => fetchWithAuth(`/problems?page=${page}&limit=${limit}`),
  getProblemById: (id) => fetchWithAuth(`/problems/${id}`),
};
