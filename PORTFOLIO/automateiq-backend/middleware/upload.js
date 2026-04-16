const cloudinary = require('cloudinary').v2
const { CloudinaryStorage } = require('multer-storage-cloudinary')
const multer = require('multer')

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
})

// Image upload → automateiq/images folder
const imageStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'automateiq/images',
    allowed_formats: ['jpg','jpeg','png','webp'],
    transformation: [{ quality: 'auto', fetch_format: 'auto' }]
  }
})

// Video upload → automateiq/videos folder
const videoStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'automateiq/videos',
    resource_type: 'video',
    allowed_formats: ['mp4','mov','webm']
  }
})

module.exports = {
  uploadImage: multer({ storage: imageStorage }),
  uploadVideo: multer({ storage: videoStorage }),
}
