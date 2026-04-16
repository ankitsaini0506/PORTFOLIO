const cloudinary = require('cloudinary').v2

const deleteFile = async (publicId, resourceType = 'image') => {
  return cloudinary.uploader.destroy(publicId, { resource_type: resourceType })
}

module.exports = { deleteFile }
