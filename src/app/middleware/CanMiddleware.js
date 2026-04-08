// middleware/CanMiddleware.js
export function can(resource, action) {
  return (req, res, next) => {
    const permissions = req.user?.roles?.permissions;

    if (!permissions) {
      return res.status(403).json({ error: 'Sem permissão' });
    }

    if (!permissions[resource]?.includes(action)) {
      return res.status(403).json({ error: 'Sem permissão' });
    }

    return next();
  };
}
