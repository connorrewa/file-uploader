const express = require('express');
const session = require('express-session');
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const PrismaClient = require('@prisma/client').PrismaClient;
const PrismaSessionStore =
    require('@quixo3/prisma-session-store').PrismaSessionStore;
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();
const app = express();

// Middleware for parsing JSON and form data
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Initialize session with Prisma session store
app.use(
    session({
        secret: process.env.SESSION_SECRET, // Replace with your secret
        resave: false,
        saveUninitialized: false,
        store: new PrismaSessionStore(prisma, {
            checkPeriod: 2 * 60 * 1000, // Check session expiration every 2 minutes
            dbRecordIdIsSessionId: true,
            dbRecordIdFunction: undefined,
        }),
        cookie: {
            maxAge: 24 * 60 * 60 * 1000, // 24 hours
        },
    })
);

// Initialize Passport and session handling
app.use(passport.initialize());
app.use(passport.session());

// Define Local Strategy for Passport
passport.use(
    new LocalStrategy(async (username, password, done) => {
        try {
            const user = await prisma.user.findUnique({
                where: { username: username },
            });
            if (!user)
                return done(null, false, { message: 'Incorrect username.' });

            const isValidPassword = await bcrypt.compare(
                password,
                user.password
            );
            if (!isValidPassword)
                return done(null, false, { message: 'Incorrect password.' });

            return done(null, user);
        } catch (error) {
            return done(error);
        }
    })
);

// Serialize and deserialize user
passport.serializeUser((user, done) => {
    done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
    try {
        const user = await prisma.user.findUnique({
            where: { id: id },
        });
        done(null, user);
    } catch (error) {
        done(error, null);
    }
});

// Routes
app.post(
    '/login',
    passport.authenticate('local', {
        successRedirect: '/files',
        failureRedirect: '/login',
        failureFlash: true,
    })
);

app.get('/files', (req, res) => {
    if (req.isAuthenticated()) {
        res.send('Welcome to your file storage!');
    } else {
        res.redirect('/login');
    }
});

app.get('/logout', (req, res) => {
    req.logout((err) => {
        if (err) {
            return next(err);
        }
        res.redirect('/login');
    });
});

app.get('/set-session', (req, res) => {
    req.session.username = 'testuser';
    res.send('Session data set.');
});

app.get('/get-session', (req, res) => {
    if (req.session.username) {
        res.send(`Session data: ${req.session.username}`);
    } else {
        res.send('No session data found.');
    }
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
