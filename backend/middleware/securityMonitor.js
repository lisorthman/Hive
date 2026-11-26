/**
 * R5 – Security event capture (Policy §8.3.1: security-relevant events are logged).
 *
 * Code that refuses a request calls flagSecurityEvent(res, ctx) to describe why.
 * When the response finishes, securityMonitor logs the flagged event, or, if nothing
 * flagged it, any 401/403/429 response. That second rule covers every ownership
 * check in the controllers without editing each one.
 */
const { logSecurityEvent } = require('../utils/securityLog');

const FALLBACK_TYPES = {
    401: 'auth_required',
    403: 'access_denied',
    429: 'rate_limited'
};

/**
 * @param {import('express').Response} res
 * @param {{eventType: string, outcome?: string, reason?: string, details?: object,
 *          severity?: string, user?: object, email?: string, statusCode?: number}} ctx
 */
const flagSecurityEvent = (res, ctx) => {
    if (res && res.locals && ctx) res.locals.securityEvent = ctx;
};

const securityMonitor = (req, res, next) => {
    res.on('finish', () => {
        const flagged = res.locals.securityEvent;
        const status = res.statusCode;

        if (flagged) {
            logSecurityEvent({
                ...flagged,
                outcome: flagged.outcome || 'denied',
                req,
                user: flagged.user || req.user,
                statusCode: flagged.statusCode || status
            });
            return;
        }

        if (FALLBACK_TYPES[status]) {
            logSecurityEvent({
                eventType: FALLBACK_TYPES[status],
                outcome: 'denied',
                req,
                user: req.user,
                statusCode: status,
                reason: `http_${status}`
            });
        }
    });
    next();
};

module.exports = { securityMonitor, flagSecurityEvent };
