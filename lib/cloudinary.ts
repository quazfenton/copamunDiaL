/**
 * Cloudinary Integration
 * 
 * Cloud-based image and video storage with optimization
 */

import { v2 as cloudinary } from 'cloudinary'

const CLOUDINARY_CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME
const CLOUDINARY_API_KEY = process.env.CLOUDINARY_API_KEY
const CLOUDINARY_API_SECRET = process.env.CLOUDINARY_API_SECRET

if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_API_KEY || !CLOUDINARY_API_SECRET) {
  console.warn('Cloudinary credentials not configured. Using local storage.')
} else {
  cloudinary.config({
    cloud_name: CLOUDINARY_CLOUD_NAME,
    api_key: CLOUDINARY_API_KEY,
    api_secret: CLOUDINARY_API_SECRET,
    secure: true,
  })
}

/**
 * Upload an image to Cloudinary
 */
export async function uploadImage(
  file: Buffer | string, // Buffer or base64 string
  folder: string,
  options?: {
    publicId?: string
    width?: number
    height?: number
    format?: string
    quality?: string
    transformation?: Array<Record<string, any>>
  }
): Promise<{
  url: string
  publicId: string
  width?: number
  height?: number
  format: string
  bytes: number
} | null> {
  if (!CLOUDINARY_CLOUD_NAME) {
    console.warn('Cloudinary not configured, skipping upload')
    return null
  }

  try {
    const uploadOptions: any = {
      folder: `copamundial/${folder}`,
      resource_type: 'image' as const,
    }

    if (options?.publicId) {
      uploadOptions.public_id = options.publicId
    }

    // Build transformation array
    const transformation: Array<Record<string, any>> = options?.transformation || []

    if (options?.width) {
      transformation.push({ width: options.width })
    }
    if (options?.height) {
      transformation.push({ height: options.height })
    }
    if (options?.quality) {
      transformation.push({ quality: options.quality })
    }
    if (options?.format) {
      uploadOptions.format = options.format
    }

    if (transformation.length > 0) {
      uploadOptions.transformation = transformation
    }

    const result = await new Promise<any>((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        uploadOptions,
        (error, result) => {
          if (error) reject(error)
          else resolve(result)
        }
      )

      if (Buffer.isBuffer(file)) {
        uploadStream.end(file)
      } else {
        // Assume base64 string
        uploadStream.end(Buffer.from(file.split(',')[1], 'base64'))
      }
    })

    return {
      url: result.secure_url,
      publicId: result.public_id,
      width: result.width,
      height: result.height,
      format: result.format,
      bytes: result.bytes,
    }
  } catch (error) {
    console.error('Cloudinary upload error:', error)
    throw new Error('Failed to upload image to Cloudinary')
  }
}

/**
 * Upload from URL (useful for external images)
 */
export async function uploadImageFromUrl(
  imageUrl: string,
  folder: string,
  options?: {
    publicId?: string
    width?: number
    height?: number
  }
): Promise<{
  url: string
  publicId: string
} | null> {
  if (!CLOUDINARY_CLOUD_NAME) {
    return null
  }

  try {
    const result = await cloudinary.uploader.upload(imageUrl, {
      folder: `copamundial/${folder}`,
      public_id: options?.publicId,
      width: options?.width,
      height: options?.height,
      resource_type: 'image',
    })

    return {
      url: result.secure_url,
      publicId: result.public_id,
    }
  } catch (error) {
    console.error('Cloudinary URL upload error:', error)
    throw new Error('Failed to upload image from URL')
  }
}

/**
 * Delete an image from Cloudinary
 */
export async function deleteImage(publicId: string): Promise<boolean> {
  if (!CLOUDINARY_CLOUD_NAME) {
    return false
  }

  try {
    const result = await cloudinary.uploader.destroy(publicId)
    return result.result === 'ok'
  } catch (error) {
    console.error('Cloudinary delete error:', error)
    return false
  }
}

/**
 * Generate optimized image URL
 */
export function getOptimizedImageUrl(
  publicId: string,
  options?: {
    width?: number
    height?: number
    quality?: number
    format?: 'auto' | 'jpg' | 'png' | 'webp'
    crop?: 'fill' | 'fit' | 'crop' | 'scale'
    gravity?: 'auto' | 'face' | 'center'
  }
): string {
  if (!CLOUDINARY_CLOUD_NAME) {
    return publicId // Return as-is if not using Cloudinary
  }

  const transformations: string[] = []

  if (options?.width) {
    transformations.push(`w_${options.width}`)
  }
  if (options?.height) {
    transformations.push(`h_${options.height}`)
  }
  if (options?.quality) {
    transformations.push(`q_${options.quality}`)
  }
  if (options?.crop) {
    transformations.push(`c_${options.crop}`)
  }
  if (options?.gravity) {
    transformations.push(`g_${options.gravity}`)
  }
  if (options?.format === 'auto') {
    transformations.push('f_auto')
  } else if (options?.format) {
    transformations.push(`f_${options.format}`)
  }

  const transformationString = transformations.join(',')

  return cloudinary.url(publicId, {
    secure: true,
    transformation: transformationString,
  })
}

/**
 * Generate responsive image srcset
 */
export function getSrcSet(
  publicId: string,
  widths: number[] = [320, 640, 960, 1280, 1920]
): string {
  if (!CLOUDINARY_CLOUD_NAME) {
    return publicId
  }

  return widths
    .map(
      (width) =>
        `${getOptimizedImageUrl(publicId, { width, format: 'auto', crop: 'scale' })} ${width}w`
    )
    .join(', ')
}

/**
 * Upload video to Cloudinary
 */
export async function uploadVideo(
  file: Buffer | string,
  folder: string,
  options?: {
    publicId?: string
  }
): Promise<{
  url: string
  publicId: string
  duration?: number
  width: number
  height: number
} | null> {
  if (!CLOUDINARY_CLOUD_NAME) {
    return null
  }

  try {
    const result = await new Promise<any>((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: `copamundial/${folder}`,
          resource_type: 'video',
          public_id: options?.publicId,
        },
        (error, result) => {
          if (error) reject(error)
          else resolve(result)
        }
      )

      if (Buffer.isBuffer(file)) {
        uploadStream.end(file)
      } else {
        uploadStream.end(Buffer.from(file.split(',')[1], 'base64'))
      }
    })

    return {
      url: result.secure_url,
      publicId: result.public_id,
      duration: result.duration,
      width: result.width,
      height: result.height,
    }
  } catch (error) {
    console.error('Cloudinary video upload error:', error)
    throw new Error('Failed to upload video to Cloudinary')
  }
}

/**
 * Get Cloudinary upload preset (for unsigned uploads from client)
 */
export function getUploadPreset(folder: string): string | null {
  if (!CLOUDINARY_CLOUD_NAME) {
    return null
  }

  // In production, you should create upload presets in your Cloudinary dashboard
  // and return the preset name here for unsigned uploads
  return `copamundial_${folder}`
}

export default {
  uploadImage,
  uploadImageFromUrl,
  deleteImage,
  getOptimizedImageUrl,
  getSrcSet,
  uploadVideo,
  getUploadPreset,
}
