const { protect, restrictTo, optionalAuth } = require('./authMiddleware');
const { errorHandler, notFound, asyncHandler } = require('./errorHandler');
const validators = require('./validators');

module.exports = {
  protect,
  restrictTo,
  optionalAuth,
  errorHandler,
  notFound,
  asyncHandler,
  ...validators,
};
