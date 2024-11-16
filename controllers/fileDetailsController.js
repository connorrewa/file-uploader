const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const cloudinary = require('cloudinary').v2;
const fs = require('fs');
const https = require('https');

exports.fileDetails = async (req, res) => {
    const fileId = req.params.fileId;

    try {
        // Fetch the file details from the database
        const file = await prisma.file.findUnique({
            where: { id: Number(fileId) },
        });

        // Check if the file exists
        if (!file) {
            return res.status(404).send('File not found');
        }

        // Determine if the file is an image (based on extension)
        const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
        const fileExtension = file.url.split('.').pop().toLowerCase();
        const isImage = imageExtensions.includes(fileExtension);

        // Render the file details page with the file data
        res.render('fileDetails', { file, isImage });
    } catch (error) {
        console.error('Error fetching file details:', error);
        res.status(500).send('An error occurred while fetching file details');
    }
};

exports.downloadFile = async (req, res) => {
    const fileId = req.params.fileId;

    try {
        // Fetch file metadata from the database
        const file = await prisma.file.findUnique({
            where: { id: Number(fileId) },
        });

        if (!file || !file.url) {
            return res.status(404).send('File not found');
        }

        var externalReq = https.request(file.url, function (externalRes) {
            res.setHeader(
                'content-disposition',
                'attachment; filename=' + file.name
            );
            externalRes.pipe(res);
        });
        externalReq.end();
    } catch (error) {
        console.error(error);
    }
};
