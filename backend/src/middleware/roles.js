const { AppError } = require('../utils/AppError');

const ROLE_RANK = {
  customer: 0,
  staff: 1,
  manager: 2,
  admin: 3,
  super_admin: 4,
};

// Usage: router.post('/meals', protect, requireRole('staff'), ...)
// Grants access to the named role AND any role ranked above it, so
// requireRole('staff') also lets managers/admins/super_admins through.
function requireRole(...allowedRoles) {
  const minRank = Math.min(...allowedRoles.map((r) => ROLE_RANK[r] ?? Infinity));

  return (req, res, next) => {
    if (!req.user) {
      return next(new AppError('You need to be signed in to do that.', 401, 'UNAUTHENTICATED'));
    }
    const userRank = ROLE_RANK[req.user.profile.role] ?? -1;
    if (userRank < minRank) {
      return next(new AppError("You don't have permission to do that.", 403, 'FORBIDDEN'));
    }
    next();
  };
}

// Only lets a user act on their own resource, unless they're staff+.
function requireSelfOrStaff(getResourceUserId) {
  return (req, res, next) => {
    if (!req.user) {
      return next(new AppError('You need to be signed in to do that.', 401, 'UNAUTHENTICATED'));
    }
    const resourceUserId = getResourceUserId(req);
    const isSelf = resourceUserId && resourceUserId === req.user.id;
    const isStaff = ROLE_RANK[req.user.profile.role] >= ROLE_RANK.staff;
    if (!isSelf && !isStaff) {
      return next(new AppError("You don't have permission to do that.", 403, 'FORBIDDEN'));
    }
    next();
  };
}

module.exports = { requireRole, requireSelfOrStaff, ROLE_RANK };
