// middleware/auth.middleware.js
/**
 * Simple API Key Authentication Middleware
 * No Firebase - uses API key from environment variables
 */

/**
 * Verify API key from request header
 */
const verifyApiKey = (req, res, next) => {
  try {
    // Get API key from header
    const apiKey = req.headers['x-api-key'];
    
    if (!apiKey) {
      return res.status(401).json({
        success: false,
        error: 'API key required',
        message: 'Include X-API-Key header in your request',
      });
    }

    // Verify API key matches environment variable
    if (apiKey !== process.env.API_KEY) {
      return res.status(401).json({
        success: false,
        error: 'Invalid API key',
        message: 'The provided API key is invalid',
      });
    }

    next();
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: 'Authentication error',
      message: error.message,
    });
  }
};

/**
 * Optional: Rate limiting per IP
 * Simple in-memory rate limiter
 */
const rateLimitStore = new Map();

const rateLimit = (maxRequests = 100, windowMs = 15 * 60 * 1000) => {
  return (req, res, next) => {
    const ip = req.ip || req.connection.remoteAddress;
    const now = Date.now();
    
    if (!rateLimitStore.has(ip)) {
      rateLimitStore.set(ip, { count: 1, resetTime: now + windowMs });
      return next();
    }

    const record = rateLimitStore.get(ip);
    
    if (now > record.resetTime) {
      rateLimitStore.set(ip, { count: 1, resetTime: now + windowMs });
      return next();
    }

    if (record.count >= maxRequests) {
      return res.status(429).json({
        success: false,
        error: 'Too many requests',
        message: 'Rate limit exceeded. Please try again later.',
      });
    }

    record.count++;
    next();
  };
};

module.exports = {
  verifyApiKey,
  rateLimit,
};
