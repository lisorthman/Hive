/**
 * In-memory stand-in for the Mongoose statics used by the R5 security log
 * (SecurityEvent, SecurityAlert, Notification and optionally AuditLog), so tests
 * need no database. Supports find/findOne(...).sort().select().limit().lean().cursor(),
 * create (code 11000 on a duplicate seq), countDocuments, findById, insertMany,
 * updateOne / findOneAndUpdate ($set, $inc) and filters with
 * $gte/$gt/$lt/$lte/$in/$ne/$regex.
 *
 * SecurityEvent keeps its REAL update/delete statics, so the append-only hooks
 * are still exercised. Tests tamper with events through store.docs('SecurityEvent').
 */
const mongoose = require('mongoose');

const newId = () => new mongoose.Types.ObjectId().toHexString();

const clone = (value) => {
    if (value === null || typeof value !== 'object') return value;
    if (value instanceof Date) return new Date(value.getTime());
    if (value instanceof RegExp) return value;
    if (typeof value.toHexString === 'function') return value.toHexString();
    if (Array.isArray(value)) return value.map(clone);
    const out = {};
    for (const [k, v] of Object.entries(value)) out[k] = clone(v);
    return out;
};

const comparable = (v) => {
    if (v instanceof Date) return v.getTime();
    if (v && typeof v.toHexString === 'function') return v.toHexString();
    return v;
};
const eq = (a, b) => {
    if (a == null || b == null) return a == b; // eslint-disable-line eqeqeq
    const x = comparable(a);
    const y = comparable(b);
    if (typeof x === 'number' && typeof y === 'number') return x === y;
    if (typeof x === 'boolean' || typeof y === 'boolean') return x === y;
    return String(x) === String(y); // ObjectId vs hex string
};

const getPath = (doc, path) => path.split('.').reduce((v, k) => (v == null ? undefined : v[k]), doc);

const isOperatorObject = (cond) =>
    cond && typeof cond === 'object' && !Array.isArray(cond) && !(cond instanceof Date)
    && typeof cond.toHexString !== 'function' && Object.keys(cond).some((k) => k.startsWith('$'));

const matchCondition = (value, cond) => {
    if (!isOperatorObject(cond)) {
        if (Array.isArray(value)) return value.some((v) => eq(v, cond));
        return eq(value, cond);
    }
    for (const [op, arg] of Object.entries(cond)) {
        const v = comparable(value);
        const a = comparable(arg);
        switch (op) {
            case '$gte': if (!(value != null && v >= a)) return false; break;
            case '$gt': if (!(value != null && v > a)) return false; break;
            case '$lte': if (!(value != null && v <= a)) return false; break;
            case '$lt': if (!(value != null && v < a)) return false; break;
            case '$ne': if (eq(value, arg)) return false; break;
            case '$in': if (!arg.some((x) => eq(value, x))) return false; break;
            case '$nin': if (arg.some((x) => eq(value, x))) return false; break;
            case '$exists': if ((value !== undefined) !== Boolean(arg)) return false; break;
            case '$regex': {
                const re = arg instanceof RegExp ? arg : new RegExp(arg, cond.$options || '');
                if (typeof value !== 'string' || !re.test(value)) return false;
                break;
            }
            case '$options': break;
            default: throw new Error(`fakeSecurityStore: unsupported operator ${op}`);
        }
    }
    return true;
};

const matches = (doc, filter = {}) => {
    for (const [key, cond] of Object.entries(filter || {})) {
        if (key === '$or') { if (!cond.some((f) => matches(doc, f))) return false; continue; }
        if (key === '$and') { if (!cond.every((f) => matches(doc, f))) return false; continue; }
        if (key === '$nor') { if (cond.some((f) => matches(doc, f))) return false; continue; }
        if (!matchCondition(getPath(doc, key), cond)) return false;
    }
    return true;
};

const parseSort = (spec) => {
    if (!spec) return [];
    if (typeof spec === 'string') {
        return spec.split(/\s+/).filter(Boolean).map((f) => (f.startsWith('-') ? [f.slice(1), -1] : [f, 1]));
    }
    return Object.entries(spec).map(([k, d]) => [k, d === -1 || d === 'desc' ? -1 : 1]);
};

/** A chainable, awaitable query over a snapshot function. */
const makeQuery = (getRows, { single = false } = {}) => {
    let sortSpec = [];
    let limitN = null;
    const run = () => {
        let rows = getRows().slice();
        for (const [field, dir] of sortSpec.slice().reverse()) {
            rows.sort((a, b) => {
                const x = comparable(getPath(a, field));
                const y = comparable(getPath(b, field));
                if (x === y) return 0;
                if (x == null) return -dir;
                if (y == null) return dir;
                return x < y ? -dir : dir;
            });
        }
        if (limitN != null) rows = rows.slice(0, limitN);
        rows = rows.map(clone);
        return single ? (rows[0] || null) : rows;
    };
    const query = {
        sort(spec) { sortSpec = parseSort(spec); return query; },
        select() { return query; },
        populate() { return query; },
        limit(n) { limitN = n; return query; },
        lean() { return query; },
        exec() { return Promise.resolve().then(run); },
        then(resolve, reject) { return query.exec().then(resolve, reject); },
        catch(reject) { return query.exec().catch(reject); },
        cursor() {
            let rows;
            let i = 0;
            const it = {
                async next() {
                    if (!rows) rows = [].concat(run() || []);
                    return i < rows.length ? rows[i++] : null;
                },
                [Symbol.asyncIterator]() {
                    return {
                        next: async () => {
                            const value = await it.next();
                            return value === null ? { done: true, value: undefined } : { done: false, value };
                        }
                    };
                }
            };
            return it;
        }
    };
    return query;
};

/** Wrap a plain array so tests can stub other models (e.g. User.find) with the same query API. */
const queryOf = (rowsOrFn, opts) => makeQuery(typeof rowsOrFn === 'function' ? rowsOrFn : () => rowsOrFn, opts);

const applyUpdate = (doc, update) => {
    const hasOps = Object.keys(update).some((k) => k.startsWith('$'));
    const set = hasOps ? (update.$set || {}) : update;
    for (const [k, v] of Object.entries(set)) doc[k] = clone(v);
    for (const [k, v] of Object.entries(update.$inc || {})) doc[k] = (doc[k] || 0) + v;
};

const UNIQUE_FIELDS = { SecurityEvent: ['seq'] };
const ALL_STATICS = [
    'find', 'findOne', 'findById', 'create', 'countDocuments', 'insertMany',
    'updateOne', 'findOneAndUpdate', 'findByIdAndUpdate', 'deleteOne', 'deleteMany'
];
// The real append-only hooks must stay in force for SecurityEvent.
const SECURITY_EVENT_STATICS = ['find', 'findOne', 'findById', 'create', 'countDocuments', 'insertMany'];

const createFakeSecurityStore = () => {
    const collections = new Map();
    const docs = (name) => {
        if (!collections.has(name)) collections.set(name, []);
        return collections.get(name);
    };

    const validate = (Model, doc) => {
        const err = new Model(doc).validateSync();
        if (err) throw err;
    };

    const insert = (Model, input) => {
        const name = Model.modelName;
        const rows = docs(name);
        for (const field of UNIQUE_FIELDS[name] || []) {
            if (rows.some((r) => eq(r[field], input[field]))) {
                const err = new Error(`E11000 duplicate key error collection: ${name} ${field}`);
                err.code = 11000;
                throw err;
            }
        }
        // Apply schema defaults, then validate against the real schema (enums, required).
        const withDefaults = new Model(input).toObject({ depopulate: true });
        const doc = clone({ ...withDefaults, ...input, _id: input._id ? String(input._id) : newId() });
        validate(Model, doc);
        rows.push(doc);
        return clone(doc);
    };

    const staticsFor = (Model) => {
        const rows = () => docs(Model.modelName);
        return {
            find: (filter) => makeQuery(() => rows().filter((d) => matches(d, filter))),
            findOne: (filter) => makeQuery(() => rows().filter((d) => matches(d, filter)), { single: true }),
            findById: (id) => makeQuery(() => rows().filter((d) => eq(d._id, id)), { single: true }),
            create: async (input) => (Array.isArray(input) ? input.map((i) => insert(Model, i)) : insert(Model, input)),
            insertMany: async (list) => list.map((i) => insert(Model, i)),
            countDocuments: async (filter) => rows().filter((d) => matches(d, filter)).length,
            updateOne: async (filter, update) => {
                const doc = rows().find((d) => matches(d, filter));
                if (doc) applyUpdate(doc, update);
                return { acknowledged: true, matchedCount: doc ? 1 : 0, modifiedCount: doc ? 1 : 0 };
            },
            findOneAndUpdate: (filter, update) => makeQuery(() => {
                const doc = rows().find((d) => matches(d, filter));
                if (!doc) return [];
                applyUpdate(doc, update);
                return [doc];
            }, { single: true }),
            findByIdAndUpdate: (id, update) => makeQuery(() => {
                const doc = rows().find((d) => eq(d._id, id));
                if (!doc) return [];
                applyUpdate(doc, update);
                return [doc];
            }, { single: true }),
            deleteOne: async (filter) => {
                const i = rows().findIndex((d) => matches(d, filter));
                if (i >= 0) rows().splice(i, 1);
                return { deletedCount: i >= 0 ? 1 : 0 };
            },
            deleteMany: async (filter) => {
                const keep = rows().filter((d) => !matches(d, filter));
                const deleted = rows().length - keep.length;
                collections.set(Model.modelName, keep);
                return { deletedCount: deleted };
            }
        };
    };

    const installed = [];
    let savedLogFile;

    return {
        docs,
        matches,
        queryOf,

        /** Replace the statics of the given models. Also turns the JSON-lines file copy off. */
        install(models) {
            savedLogFile = process.env.SECURITY_LOG_FILE;
            process.env.SECURITY_LOG_FILE = 'off';
            for (const Model of models) {
                const fake = staticsFor(Model);
                const names = Model.modelName === 'SecurityEvent' ? SECURITY_EVENT_STATICS : ALL_STATICS;
                for (const name of names) {
                    installed.push({ Model, name, original: Model[name], own: Object.prototype.hasOwnProperty.call(Model, name) });
                    Model[name] = fake[name];
                }
            }
        },

        restore() {
            while (installed.length) {
                const { Model, name, original, own } = installed.pop();
                if (own) Model[name] = original;
                else delete Model[name];
            }
            if (savedLogFile === undefined) delete process.env.SECURITY_LOG_FILE;
            else process.env.SECURITY_LOG_FILE = savedLogFile;
        },

        reset() {
            collections.clear();
        }
    };
};

module.exports = { createFakeSecurityStore, matches, queryOf };
