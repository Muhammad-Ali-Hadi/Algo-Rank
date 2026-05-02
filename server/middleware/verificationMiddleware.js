/**
 * Middleware to check if a user has a verified email.
 * This is used for actions that require verification (e.g. creating/joining contests).
 */
const verificationMiddleware = (req, res, next) => {
  // req.user is populated by authMiddleware
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  if (!req.user.isVerified) {
    return res.status(403).json({ 
      error: 'Email verification required', 
      requiresVerification: true 
    });
  }

  next();
};

module.exports = verificationMiddleware;
