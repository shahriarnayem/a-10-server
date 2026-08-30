export function authorizeRoles(...allowedRoles) {
  return function roleAuthorization(req, res, next) {
    const role = req.auth?.user?.role;
 
    if (!role || !allowedRoles.includes(role)) {
      return res.status(403).json({ message: "Your marketplace role cannot access this resource." });
    }
 
    return next();
  };
}
