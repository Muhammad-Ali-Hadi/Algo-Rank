require('dotenv').config(); // Reloaded config to fix email issues
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const authRoutes = require('./routes/authRoutes');
const passwordRoutes = require('./routes/passwordRoutes');
const contestRoutes = require('./routes/contestRoutes');
const profileRoutes = require('./routes/profileRoutes');
const problemRoutes = require('./routes/problemRoutes');
const { errorHandler, notFound } = require('./middleware/errorHandler');
const { generalLimiter, authLimiter } = require('./middleware/rateLimiter');
const { globalThrottler } = require('./middleware/throttler');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true,
}));
app.use(morgan('dev'));
app.use(express.json({ limit: '5mb' })); // Increased to 5MB to comfortably handle 1MB+ base64 avatars


// Global rate limiter & Concurrency Queue
app.use(generalLimiter);
app.use(globalThrottler);

// Routes
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/password', authLimiter, passwordRoutes);
app.use('/api/contests', contestRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/problems', problemRoutes);

// Error handling
app.use(notFound);
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`AlgoRank server running on port ${PORT}`);
});
