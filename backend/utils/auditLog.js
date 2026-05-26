const crypto = require('crypto');
const AuditLog = require('../models/AuditLog');

const hashPayload = (payload) => {
    const normalized = JSON.stringify(payload, Object.keys(payload).sort());
    return crypto.createHash('sha256').update(normalized).digest('hex');
};

/**
 * @param {object} opts
 * @param {import('mongoose').Document} opts.actor - req.user
 * @param {string} opts.action
 * @param {string} opts.targetType
 * @param {import('mongoose').Types.ObjectId|string} opts.targetId
 * @param {object} opts.payload - sanitized snapshot for hashing
 */
const recordAudit = async ({ actor, action, targetType, targetId, payload }) => {
    await AuditLog.create({
        actor: actor._id || actor.id,
        actorName: actor.name,
        actorRole: actor.role,
        action,
        targetType,
        targetId,
        payloadHash: hashPayload(payload)
    });
};

module.exports = { recordAudit, hashPayload };
