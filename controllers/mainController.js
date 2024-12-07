const bcrypt = require('bcrypt');
const passport = require('passport');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

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
        this.loginUser(req, res);
    } catch (error) {
        errorMessage = error;
        res.redirect('signup?error=User%20already%20exists');
        console.error(error);
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

// Controller for sharing a folder
exports.shareFolder = async (req, res) => {
    const { folderId, duration } = req.body;
    const expiresAt = new Date(Date.now() + duration * 24 * 60 * 60 * 1000); // duration in days

    try {
        const sharedFolder = await prisma.sharedFolder.create({
            data: {
                userId: req.user.id,
                id: uuidv4(),
                folderId: folderId ? parseInt(folderId) : null, // Handle root folder case
                expiresAt,
            },
        });
        res.redirect(`/share/${sharedFolder.id}`);
    } catch (error) {
        console.error(error);
        res.status(500).send('Error sharing folder');
    }
};

// Helper function to get folder hierarchy
async function getFolderHierarchy(folderId) {
    const folder = await prisma.folder.findUnique({
        where: { id: folderId },
        include: {
            files: true,
            subfolders: {
                include: {
                    files: true,
                    subfolders: true,
                },
            },
        },
    });

    if (!folder) {
        return null;
    }

    const subfolders = await Promise.all(
        folder.subfolders.map(async (subfolder) => {
            return await getFolderHierarchy(subfolder.id);
        })
    );

    return {
        ...folder,
        subfolders,
    };
}

// Controller for accessing a shared folder
exports.getSharedFolder = async (req, res) => {
    const { id } = req.params;

    try {
        const sharedFolder = await prisma.sharedFolder.findUnique({
            where: { id },
            include: { folder: true },
        });

        const user = await prisma.user.findUnique({
            where: { id: sharedFolder.userId },
        });

        if (!sharedFolder || sharedFolder.expiresAt < new Date()) {
            return res.status(404).send('Shared folder not found or expired');
        }

        let folder;
        if (sharedFolder.folderId) {
            folder = await prisma.folder.findUnique({
                where: { id: sharedFolder.folderId },
                include: { files: true },
            });
        } else {
            folder = {
                id: null,
                name: `${user.username}'s Shared Folder`,
                files: await prisma.file.findMany({
                    where: {
                        folderId: null,
                        userId: sharedFolder.userId,
                    },
                }),
                subfolders: [], // No subfolders for root
            };
        }

        res.render('sharedFolder', { folder });
    } catch (error) {
        console.error(error);
        res.status(500).send('Error accessing shared folder');
    }
};
