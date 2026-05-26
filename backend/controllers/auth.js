const jwt = require('jsonwebtoken');
const User = require('../models/User');
const {
    generateEmailVerificationToken,
    sendVerificationEmail
} = require('../utils/emailVerification');

// @desc    Register user
// @route   POST /api/auth/register
// @access  Public
exports.register = async (req, res) => {
    try {
        const { name, password, role } = req.body;
        const email = (req.body.email || '').trim().toLowerCase();

        if (!email) {
            return res.status(400).json({
                success: false,
                error: 'Please provide a valid email address'
            });
        }

        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({
                success: false,
                error: 'An account with this email already exists. Please log in or use a different email.'
            });
        }

        const assignedRole = role === 'admin' ? 'volunteer' : role;

        let verificationDocument = '';
        if (assignedRole === 'ngo') {
            if (!req.file) {
                return res.status(400).json({
                    success: false,
                    error: 'Please upload a verification document (PDF)'
                });
            }
            verificationDocument = `uploads/${req.file.filename}`;
        }

        const userPayload = {
            name,
            email,
            password,
            role: assignedRole,
            verificationDocument: assignedRole === 'ngo' ? verificationDocument : undefined
        };

        if (assignedRole === 'volunteer') {
            userPayload.emailVerified = false;
            const { token, expire } = generateEmailVerificationToken();
            userPayload.emailVerificationToken = token;
            userPayload.emailVerificationExpire = expire;
        }

        const user = await User.create(userPayload);

        if (assignedRole === 'volunteer') {
            const verificationLink = sendVerificationEmail({
                email: user.email,
                name: user.name,
                token: user.emailVerificationToken
            });

            return res.status(201).json({
                success: true,
                requiresVerification: true,
                message: 'Account created. Please verify your email before logging in.',
                email: user.email,
                ...(process.env.NODE_ENV !== 'production' && { devVerificationLink: verificationLink })
            });
        }

        sendTokenResponse(user, 201, res);
    } catch (err) {
        console.error('Registration error:', err);
        if (err.code === 11000) {
            return res.status(400).json({
                success: false,
                error: 'An account with this email already exists. Please log in or use a different email.'
            });
        }
        res.status(400).json({
            success: false,
            error: err.message
        });
    }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
exports.login = async (req, res) => {
    try {
        const email = (req.body.email || '').trim().toLowerCase();
        const { password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                success: false,
                error: 'Please provide an email and password'
            });
        }

        const user = await User.findOne({ email }).select('+password');

        if (!user) {
            return res.status(401).json({
                success: false,
                error: 'Invalid credentials'
            });
        }

        const isMatch = await user.matchPassword(password);
        if (!isMatch) {
            return res.status(401).json({
                success: false,
                error: 'Invalid credentials'
            });
        }

        if (user.accountStatus === 'suspended') {
            return res.status(403).json({
                success: false,
                error: 'Your account has been suspended. Contact an administrator.'
            });
        }

        if (user.role === 'volunteer' && !user.emailVerified) {
            if (!user.emailVerificationToken) {
                user.emailVerified = true;
                await user.save({ validateBeforeSave: false });
            } else {
                return res.status(403).json({
                    success: false,
                    error: 'Please verify your email before logging in. Check your inbox or resend the verification link.',
                    requiresVerification: true,
                    email: user.email
                });
            }
        }

        if (user.role === 'ngo') {
            if (user.verificationStatus === 'pending') {
                return res.status(403).json({
                    success: false,
                    error: 'Your account is pending verification. Please wait for admin approval.'
                });
            }
            if (user.verificationStatus === 'rejected') {
                return res.status(403).json({
                    success: false,
                    error: 'Your account application has been rejected. Please contact support.'
                });
            }
        }

        sendTokenResponse(user, 200, res);
    } catch (err) {
        console.error('Login error:', err.message);
        res.status(400).json({
            success: false,
            error: err.message
        });
    }
};

// @desc    Verify volunteer email
// @route   GET /api/auth/verify-email/:token
// @access  Public
exports.verifyEmail = async (req, res) => {
    try {
        const user = await User.findOne({
            emailVerificationToken: req.params.token,
            emailVerificationExpire: { $gt: Date.now() }
        });

        if (!user) {
            return res.status(400).json({
                success: false,
                error: 'Invalid or expired verification token'
            });
        }

        user.emailVerified = true;
        user.emailVerificationToken = undefined;
        user.emailVerificationExpire = undefined;
        await user.save();

        res.status(200).json({
            success: true,
            message: 'Email verified successfully. You can now log in.'
        });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
};

// @desc    Resend verification email
// @route   POST /api/auth/resend-verification
// @access  Public
exports.resendVerification = async (req, res) => {
    try {
        const email = (req.body.email || '').trim().toLowerCase();
        if (!email) {
            return res.status(400).json({ success: false, error: 'Email is required' });
        }

        const user = await User.findOne({ email, role: 'volunteer' });
        if (!user) {
            return res.status(200).json({
                success: true,
                message: 'If an account exists, a verification email has been sent.'
            });
        }

        if (user.emailVerified) {
            return res.status(400).json({
                success: false,
                error: 'This email is already verified'
            });
        }

        const { token, expire } = generateEmailVerificationToken();
        user.emailVerificationToken = token;
        user.emailVerificationExpire = expire;
        await user.save();

        const verificationLink = sendVerificationEmail({
            email: user.email,
            name: user.name,
            token
        });

        res.status(200).json({
            success: true,
            message: 'Verification email sent.',
            ...(process.env.NODE_ENV !== 'production' && { devVerificationLink: verificationLink })
        });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
};

// @desc    Get current user profile
// @route   GET /api/auth/me
// @access  Private
exports.getMe = async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select(
            '-password -emailVerificationToken -emailVerificationExpire'
        );
        res.status(200).json({ success: true, data: user });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
};

// @desc    Update volunteer profile (interests, skills, availability)
// @route   PUT /api/auth/profile
// @access  Private
exports.updateProfile = async (req, res) => {
    try {
        const allowed = ['name', 'bio', 'interests', 'skills', 'availability'];
        const updates = {};
        for (const key of allowed) {
            if (req.body[key] !== undefined) updates[key] = req.body[key];
        }

        if (updates.interests && !Array.isArray(updates.interests)) {
            return res.status(400).json({ success: false, error: 'interests must be an array' });
        }
        if (updates.skills && !Array.isArray(updates.skills)) {
            return res.status(400).json({ success: false, error: 'skills must be an array' });
        }

        const user = await User.findByIdAndUpdate(req.user.id, updates, {
            new: true,
            runValidators: true
        }).select('-password -emailVerificationToken -emailVerificationExpire');

        res.status(200).json({ success: true, data: user });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
};

const sendTokenResponse = (user, statusCode, res) => {
    const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRE
    });

    res.status(statusCode).json({
        success: true,
        token,
        user: {
            id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            emailVerified: user.emailVerified,
            interests: user.interests,
            skills: user.skills,
            availability: user.availability,
            bio: user.bio
        }
    });
};
