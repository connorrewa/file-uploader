const path = require('path');
const fs = require('fs');
const { PrismaClient } = require('@prisma/client');
const { createClient } = require('@supabase/supabase-js');
const prisma = new PrismaClient();
const { v4: uuidv4 } = require('uuid');
const cloudinary = require('cloudinary').v2;
const multer = require('multer');

/* const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_KEY
); */

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

exports.viewFiles = async (req, res) => {
    const currentFolderId = req.params.folderId || null; // Default to root if no folder ID is provided
    const userId = req.user.id; // Get the authenticated user's ID

    try {
        // Fetch the current folder (if specified)
        const currentFolder = currentFolderId
            ? await prisma.folder.findUnique({
                  where: { id: Number(currentFolderId), userId },
              })
            : null;

        // Fetch folders within the current folder
        const folders = await prisma.folder.findMany({
            where: {
                userId,
                parentFolderId: currentFolderId
                    ? Number(currentFolderId)
                    : null,
            },
        });

        // Fetch files within the current folder
        const uploadedFiles = await prisma.file.findMany({
            where: {
                userId,
                folderId: currentFolderId ? Number(currentFolderId) : undefined,
            },
        });

        // Render the template with folders, files, and current folder data
        res.render('files', {
            folders,
            files: uploadedFiles,
            currentFolder,
            currentUser: req.user,
        });
    } catch (error) {
        console.error('Error fetching files and folders:', error);
        res.status(500).json({ error: 'Failed to retrieve files and folders' });
    }
};

exports.createFolder = async (req, res) => {
    const { name, parentFolderId } = req.body;
    const userId = req.user.id;

    const parentFolderIdInt = parentFolderId ? Number(parentFolderId) : null;

    console.log('Request Body:', req.body); // Debug log

    if (!name) {
        return res.status(400).json({ error: 'Folder name is required' });
    }

    try {
        const folder = await prisma.folder.create({
            data: {
                userId,
                name,
                parentFolderId: parentFolderIdInt,
            },
        });
        res.redirect('back');
    } catch (error) {
        console.error('Error creating folder:', error);
        res.status(500).json({ error: 'Failed to create folder' });
    }
};

exports.getFolder = async (req, res) => {
    const userId = req.user.id;

    // Parse folderIds from the URL parameters (path segments)
    const folderIds = req.params[0]?.split('/').map((id) => Number(id)) || [];

    try {
        let currentFolderId = null; // Initially null for the root folder
        let currentFolder = null; // Will hold the current folder

        // If no folder IDs are passed, we're at the root folder
        if (folderIds.length === 0) {
            currentFolderId = null; // Representing the root folder (null ID)
        }

        // Loop through the folder IDs to resolve each folder in the path
        for (const folderId of folderIds) {
            // Fetch the folder by ID and ensure it belongs to the correct user
            const folder = await prisma.folder.findUnique({
                where: {
                    id: folderId,
                    userId,
                },
            });

            // If folder not found or parent folder ID is incorrect, return an error
            if (!folder) {
                return res
                    .status(404)
                    .json({ error: 'Folder not found or invalid hierarchy' });
            }

            // Validate the folder's parent ID to ensure we're navigating correctly
            // For the root folder, currentFolderId is null, so no validation needed
            if (
                currentFolderId !== null &&
                folder.parentFolderId !== currentFolderId
            ) {
                return res
                    .status(404)
                    .json({ error: 'Invalid folder hierarchy' });
            }

            // Set the current folder ID to this folder's ID for the next iteration
            currentFolderId = folderId;
            currentFolder = folder; // Update the current folder
        }

        // After looping, currentFolderId should hold the final folder's ID
        const subfolders = await prisma.folder.findMany({
            where: {
                parentFolderId: currentFolderId,
                userId,
            },
        });

        const files = await prisma.file.findMany({
            where: {
                userId,
                folderId: currentFolderId === null ? null : currentFolderId,
            },
        });

        // Render the folder's page with subfolders and files
        res.render('files', {
            currentFolder, // Ensure the current folder is passed to the view
            folders: subfolders,
            files,
        });
    } catch (error) {
        console.error('Error fetching folder details:', error);
        res.status(500).json({ error: 'Failed to retrieve folder details' });
    }
};

// Controller for deleting a folder
exports.deleteFolder = async (req, res) => {
    const folderId = req.params.folderId; // Folder ID from the URL parameter
    const userId = req.user.id; // Authenticated user's ID

    try {
        // Check if the folder exists and belongs to the current user
        const folder = await prisma.folder.findUnique({
            where: { id: Number(folderId), userId },
        });

        if (!folder) {
            return res
                .status(404)
                .json({ error: 'Folder not found or unauthorized' });
        }

        // Check if the folder has subfolders
        const subfolders = await prisma.folder.findMany({
            where: { parentFolderId: Number(folderId) },
        });

        // Check if the folder contains files
        const files = await prisma.file.findMany({
            where: { folderId: Number(folderId) },
        });

        // If the folder has subfolders or files, return an error
        if (subfolders.length > 0 || files.length > 0) {
            return res.status(400).json({
                error: 'Folder contains files or subfolders and cannot be deleted',
            });
        }

        // If folder is empty (no files or subfolders), delete it
        await prisma.folder.delete({
            where: { id: Number(folderId) },
        });

        res.redirect('back');
    } catch (error) {
        console.error('Error deleting folder:', error);
        res.status(500).json({ error: 'Failed to delete folder' });
    }
};

exports.deleteFile = async (req, res) => {
    const fileId = req.params.fileId; // File ID from the URL parameter
    const userId = req.user.id; // Authenticated user's ID

    try {
        // Check if the file exists and belongs to the current user
        const file = await prisma.file.findUnique({
            where: { id: Number(fileId), userId },
        });

        if (!file) {
            return res
                .status(404)
                .json({ error: 'File not found or unauthorized' });
        }

        // Delete the file from the database
        await prisma.file.delete({
            where: { id: Number(fileId) },
        });

        res.redirect('back');
    } catch (error) {
        console.error('Error deleting file:', error);
    }
};

exports.uploadFile = async (req, res) => {
    const { folderId } = req.body;
    const userId = req.user.id;

    if (!req.file) {
        return res.status(400).json({ error: 'No file provided' });
    }

    const file = req.file;

    try {
        // Upload file to Cloudinary
        cloudinary.uploader.upload(
            file.path,
            {
                folder: `user_files/${userId}`, // Organize by user
                resource_type: 'auto', // Automatically detect the file type
            },
            async (error, result) => {
                if (error) {
                    console.error('Cloudinary upload error:', error);
                    // Clean up the local file path in case of an error
                    fs.unlinkSync(file.path);
                    return res
                        .status(500)
                        .json({ error: 'File upload failed' });
                }

                // Save the file metadata (Cloudinary URL) to your database
                const savedFile = await prisma.file.create({
                    data: {
                        name: file.originalname,
                        size: file.size,
                        url: result.secure_url, // Cloudinary URL
                        userId,
                        folderId: folderId ? Number(folderId) : null, // Optional folderId
                    },
                });

                // Clean up the local file after uploading to Cloudinary
                fs.unlinkSync(file.path);

                res.redirect('back');
            }
        );
    } catch (error) {
        console.error('Error saving file metadata:', error);
        // Clean up the local file in case of an error
        fs.unlinkSync(file.path);
        res.status(500).json({ error: 'Failed to save file metadata' });
    }
};
