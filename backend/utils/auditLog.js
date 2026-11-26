const crypto = require('crypto');
const AuditLog = require('../models/AuditLog');
const { logSecurityEvent } = require('./securityLog');

const hashPayload = (payload) => {
    const normalized = JSON.stringify(payload, Object.keys(payload).sort());
    return crypto.createHash('sha256').update(normalized).digest('hex');
};

// R5 (§8.3.1): admin actions are mirrored into the tamper-evident security event chain.
const SECURITY_EVENT_FOR_ACTION = {
    ngo_status_changed: 'ngo_verification_changed',
    user_suspended: 'account_status_changed',
    user_activated: 'account_status_changed',
    user_removed: 'user_removed'
};

/**
 * @param {object} opts
 * @param {import('mongoose').Document} opts.actor - req.user
 * @param {string} opts.action
 * @param {string} opts.targetType
 * @param {import('mongoose').Types.ObjectId|string} opts.targetId
 * @param {object} opts.payload - sanitized snapshot for hashing
 * @param {import('express').Request} [opts.req] - request, for IP / user agent / route in the security log
 */
const recordAudit = async ({ actor, action, targetType, targetId, payload, req }) => {
    const payloadHash = hashPayload(payload);
    const entry = await AuditLog.create({
        actor: actor._id || actor.id,
        actorName: actor.name,
        actorRole: actor.role,
        action,
        targetType,
        targetId,
        payloadHash
    });

    // Mirror into the hash chain (§8.3.4). The auditLogId + payloadHash let verifyChain
    // detect an audit entry that was later deleted or edited. Not awaited: logging never
    // slows down or breaks the admin action (logSecurityEvent never throws).
    logSecurityEvent({
        eventType: SECURITY_EVENT_FOR_ACTION[action] || 'admin_action',
        outcome: 'success',
        req,
        user: actor,
        reason: action,
        details: {
            action,
            targetType,
            targetId: targetId ? String(targetId) : null,
            auditLogId: entry && entry._id ? String(entry._id) : null,
            payloadHash
        }
    });

    return entry;
};

module.exports = { recordAudit, hashPayload };
