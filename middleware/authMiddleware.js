const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Protect routes - user must be authenticated
exports.checkAuthenticated = async (req, res, next) => {
  try {
    // 1) Check if token exists
    let token;
    if (req.cookies.token) {
      token = req.cookies.token;
    }

    if (!token) {
      return res.redirect('/login');
    }

    // 2) Verify token
    const decoded = await new Promise((resolve, reject) => {
      jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
        if(err) {
          res.clearCookie('token');
          if (err.name === 'TokenExpiredError'){
            return res.redirect('/login?error=session_expired');
          }
          return reject(new Error('Invalid token'));
        }
        resolve(decoded);
      });
    });

    // 3) Check if user still exists
    const currentUser = await User.findById(decoded.id);
    if (!currentUser) {
      res.clearCookie('token');
      return res.redirect('/login');
    }

    // 4) Grant access to protected route
    req.user = currentUser;
    res.locals.user = currentUser;
    next();
  } catch (err) {
    console.error(err);
    res.redirect('/login');
  }
};

// Redirect if user is already authenticated
exports.checkNotAuthenticated = (req, res, next) => {
  if (req.cookies.token) {
    return res.redirect('/users/dashboard');
  }
  next();
};