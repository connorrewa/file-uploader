const express = require('express');
const session = require('express-session');
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const PrismaClient = require('@prisma/client').PrismaClient;
const PrismaSessionStore =
    require('@quixo3/prisma-session-store').PrismaSessionStore;
const bcrypt = require('bcrypt');
const router = require('./routes/router');
const path = require('path');

const prisma = new PrismaClient();
const app = express();

app.set('view engine', 'ejs');
app.set('views', './views');

// Middleware for parsing JSON and form data
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(express.static(path.join(__dirname, 'uploads')));

// Initialize session with Prisma session store
app.use(
    session({
        secret: process.env.SESSION_SECRET,
        resave: false,
        saveUninitialized: false,
        store: new PrismaSessionStore(prisma, {
            checkPeriod: 2 * 60 * 1000,
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

app.get('/', (req, res) => {
    res.redirect('/login');
});

app.use(router);

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
