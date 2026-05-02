const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'algorank-secret-key';

// Helper to determine if a user is an admin
function isAdminUser(email, username) {
  const adminEmail = (process.env.EMAIL_USER || '').toLowerCase();
  return (
    email.toLowerCase() === adminEmail ||
    username.toLowerCase() === 'adminteam'
  );
}

// Generate JWT token for a user
function generateToken(user) {
  const isAdmin = isAdminUser(user.email, user.username);
  return jwt.sign(
    { 
      id: user.id, 
      email: user.email, 
      username: user.username, 
      isAdmin,
      isVerified: !!user.is_verified 
    },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

module.exports = {
  isAdminUser,
  generateToken,
  JWT_SECRET
};
