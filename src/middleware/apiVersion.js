const semver = require('semver');

const apiVersion = (req, res, next) => {
  const version = req.headers['accept-version'] || '1.0.0';

  if (!semver.valid(version)) {
    return res.status(400).json({ error: 'Invalid API version' });
  }

  req.apiVersion = version;
  next();
};

module.exports = apiVersion;
