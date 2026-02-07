const jwt = require('jsonwebtoken');
const User = require('../models/User');

// @desc    Register user
// @route   POST /api/auth/register
// @access  Public
exports.register = async (req, res) => {
    try {
        const { name, email, password, role } = req.body;
        console.log(`Registering user: ${email} as ${role}`);

        // Prevent registration as admin
        const assignedRole = role === 'admin' ? 'volunteer' : role;

        // Check if NGO uploaded a file
        let verificationDocument = '';
        if (assignedRole === 'ngo') {
            if (!req.file) {
                return res.status(400).json({
                    success: false,
                    error: 'Please upload a verification document (PDF)'
                });
            }
            // Store relative path
            verificationDocument = `uploads/${req.file.filename}`;
        }

        // Create user
        const user = await User.create({
            name,
            email,
            password,
            role: assignedRole,
            verificationDocument: assignedRole === 'ngo' ? verificationDocument : undefined
        });

        sendTokenResponse(user, 201, res);
    } catch (err) {
        console.error('Registration error:', err);
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
        const { email, password } = req.body;
        console.log(`Login attempt for: ${email}`);

        // Validate email & password
        if (!email || !password) {
            return res.status(400).json({
                success: false,
                error: 'Please provide an email and password'
            });
        }

        // Check for user
        const user = await User.findOne({ email }).select('+password');

        if (!user) {
            console.log(`User not found: ${email}`);
            return res.status(401).json({
                success: false,
                error: 'Invalid credentials'
            });
        }

        // Check if password matches
        const isMatch = await user.matchPassword(password);

        if (!isMatch) {
            console.log(`Password mismatch for: ${email}`);
            return res.status(401).json({
                success: false,
                error: 'Invalid credentials'
            });
        }

        // Check verification status (specific for NGOs)
        if (user.role === 'ngo') {
            if (user.verificationStatus === 'pending') {
                console.log(`Pending NGO login attempt: ${email}`);
                return res.status(403).json({
                    success: false,
                    error: 'Your account is pending verification. Please wait for admin approval.'
                });
            }
            if (user.verificationStatus === 'rejected') {
                console.log(`Rejected NGO login attempt: ${email}`);
                return res.status(403).json({
                    success: false,
                    error: 'Your account application has been rejected. Please contact support.'
                });
            }
        }

        console.log(`Login successful for: ${email} (Role: ${user.role})`);

        // Trigger notifications for NGOs whose missions this volunteer has joined
        if (user.role === 'volunteer') {
            try {
                const Event = require('../models/Event');
                const Notification = require('../models/Notification');

                // Find all NGOs this volunteer is connected to via missions
                const joinedEvents = await Event.find({ volunteersJoined: user._id });
                const ngoIds = [...new Set(joinedEvents.map(e => e.organization.toString()))];

                for (const ngoId of ngoIds) {
                    await Notification.create({
                        recipient: ngoId,
                        sender: user._id,
                        type: 'volunteer_login',
                        message: `Volunteer ${user.name} is now online.`
                    });
                }
            } catch (error) {
                console.error('Failed to trigger login notifications:', error);
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

// Get token from model, create cookie and send response
const sendTokenResponse = (user, statusCode, res) => {
    // Create token
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
            role: user.role
        }
    });
};
