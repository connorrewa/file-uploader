const bcrypt = require('bcrypt');
const passport = require('passport');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const fs = require('fs');

// Controller for rendering the sign-in page
exports.getLoginPage = (req, res) => {
    const errorMessage = req.query.error || ''; // Retrieve error message from query parameter
    res.render('signin', { errorMessage, currentUser: null });
};

// Controller for rendering the sign-up page
exports.getSignupPage = (req, res) => {
    const errorMessage = req.query.error || '';
    res.render('signup', { errorMessage, currentUser: null });
};

// Controller for handling the sign-up process
exports.signupUser = async (req, res) => {
    const { username, password } = req.body;

    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        await prisma.user.create({
            data: { username, password: hashedPassword },
        });
        res.redirect('/login');
    } catch (error) {
        console.error(error);
        res.status(500).send('Error signing up. Please try again.');
    }
};

// Controller for handling the login process
exports.loginUser = (req, res, next) => {
    passport.authenticate('local', (err, user, info) => {
        if (err) {
            return next(err);
        }
        if (!user) {
            // Redirect to login page with error message in query string
            return res.redirect(
                '/login?error=Invalid%20username%20or%20password'
            );
        }
        req.logIn(user, (err) => {
            if (err) {
                return next(err);
            }
            return res.redirect('/files');
        });
    })(req, res, next);
};

// Controller for logging out
exports.logoutUser = (req, res) => {
    req.logout((err) => {
        if (err) {
            return next(err);
        }
        res.redirect('/login');
    });
};

// Controller for setting session data (test endpoint)
exports.setSessionData = (req, res) => {
    req.session.username = 'testuser';
    res.send('Session data set.');
};

// Controller for getting session data (test endpoint)
exports.getSessionData = (req, res) => {
    if (req.session.username) {
        res.send(`Session data: ${req.session.username}`);
    } else {
        res.send('No session data found.');
    }
};
