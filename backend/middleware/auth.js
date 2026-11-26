const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { flagSecurityEvent } = require('./securityMonitor');

// R5 (§8.3.1): every refusal below is flagged so securityMonitor logs why it happened.
// The token itself is never logged, only the error name.

// Protect routes
exports.protect = async (req, res, next) => {
    let token;

    if (
        req.headers.authorization &&
        req.headers.authorization.startsWith('Bearer')
    ) {
        // Set token from Bearer token in header
        token = req.headers.authorization.split(' ')[1];
    }

    // Make sure token exists
    if (!token) {
        flagSecurityEvent(res, { eventType: 'auth_required', outcome: 'denied', reason: 'missing_token' });
        return res.status(401).json({
            success: false,
            error: 'Not authorized to access this route'
        });
    }

    try {
        // Verify token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        req.user = await User.findById(decoded.id);

        if (!req.user) {
            flagSecurityEvent(res, { eventType: 'auth_required', outcome: 'denied', reason: 'unknown_user' });
            return res.status(401).json({
                success: false,
                error: 'Not authorized to access this route'
            });
        }

        if (req.user.accountStatus === 'suspended') {
            flagSecurityEvent(res, { eventType: 'access_denied', outcome: 'denied', reason: 'account_suspended' });
            return res.status(403).json({
                success: false,
                error: 'Your account has been suspended. Contact an administrator.'
            });
        }

        next();
    } catch (err) {
        const reason = err.name === 'TokenExpiredError'
            ? 'expired_token'
            : (err.name === 'JsonWebTokenError' || err.name === 'NotBeforeError')
                ? 'invalid_token'
                : 'auth_check_error';
        flagSecurityEvent(res, {
            eventType: 'auth_required',
            outcome: 'denied',
            reason,
            details: { errorName: err.name }
        });
        return res.status(401).json({
            success: false,
            error: 'Not authorized to access this route'
        });
    }
};

// Grant access to specific roles
exports.authorize = (...roles) => {
    return (req, res, next) => {
        if (!roles.includes(req.user.role)) {
            flagSecurityEvent(res, {
                eventType: 'access_denied',
                outcome: 'denied',
                reason: 'role_not_permitted',
                details: { requiredRoles: roles, role: req.user.role }
            });
            return res.status(403).json({
                success: false,
                error: `User role ${req.user.role} is not authorized to access this route`
            });
        }
        next();
    };
};

exports.requireVerifiedNgoOrAdmin = (req, res, next) => {
    if (req.user.role === 'admin') return next();
    if (req.user.role !== 'ngo') {
        flagSecurityEvent(res, {
            eventType: 'access_denied',
            outcome: 'denied',
            reason: 'role_not_permitted',
            details: { requiredRoles: ['ngo', 'admin'], role: req.user.role }
        });
        return res.status(403).json({ success: false, error: 'Only NGOs can perform this action' });
    }
    if (req.user.verificationStatus !== 'verified') {
        flagSecurityEvent(res, { eventType: 'access_denied', outcome: 'denied', reason: 'ngo_not_verified' });
        return res.status(403).json({
            success: false,
            error: 'Only verified NGOs can publish impact stories'
        });
    }
    next();
};

exports.requireVerifiedVolunteerOrAdmin = async (req, res, next) => {
    if (req.user.role === 'admin') return next();
    if (req.user.role !== 'volunteer') {
        flagSecurityEvent(res, {
            eventType: 'access_denied',
            outcome: 'denied',
            reason: 'role_not_permitted',
            details: { requiredRoles: ['volunteer', 'admin'], role: req.user.role }
        });
        return res.status(403).json({ success: false, error: 'Only volunteers can perform this action' });
    }
    if (!req.user.emailVerified) {
        flagSecurityEvent(res, { eventType: 'access_denied', outcome: 'denied', reason: 'email_not_verified' });
        return res.status(403).json({
            success: false,
            error: 'Verify your email before participating in community feed actions'
        });
    }
    next();
};
