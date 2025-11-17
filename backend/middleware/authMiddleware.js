const jwt = require('jsonwebtoken');
const User = require('../models/user');

const protect = async (req, res, next) => {
  let token;
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      console.log('Decoded JWT:', decoded);
      req.user = await User.findById(decoded.id).select('-password');
      console.log('req.user after DB:', req.user);
      if (!req.user) {
        return res.status(401).json({ message: 'User not found, unauthorized.' });
      }
      return next();
    } catch (error) {
      console.error('JWT error:', error);
      return res.status(401).json({ message: 'Not authorized, token failed.' });
    }
  }
  return res.status(401).json({ message: 'No token, authorization denied.' });
};

module.exports = protect;
