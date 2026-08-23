import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'smartblood_secret_prototype_key_2026';

/**
 * Generate a signed JWT token
 * @param {object} payload 
 * @returns {string}
 */
export function generateToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

/**
 * General auth middleware: requires valid token
 */
export function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication token is required.' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired session token. Please log in again.' });
  }
}

/**
 * Hospital role middleware
 */
export function requireHospital(req, res, next) {
  requireAuth(req, res, () => {
    if (req.user.role !== 'hospital') {
      return res.status(403).json({ error: 'Access restricted to authorized hospital accounts.' });
    }
    next();
  });
}

/**
 * Donor role middleware
 */
export function requireDonor(req, res, next) {
  requireAuth(req, res, () => {
    if (req.user.role !== 'donor') {
      return res.status(403).json({ error: 'Access restricted to registered donor accounts.' });
    }
    next();
  });
}

/**
 * Admin role middleware
 */
export function requireAdmin(req, res, next) {
  requireAuth(req, res, () => {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access restricted to system administrators.' });
    }
    next();
  });
}
