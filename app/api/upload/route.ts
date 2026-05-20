import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { v4 as uuidv4 } from 'uuid'
import sharp from 'sharp'
import { z } from 'zod'
import { handleError } from '@/lib/error-handler'
import { withCSRF } from '@/lib/security'

const UPLOAD_DIR = join(process.cwd(), 'public/uploads')
const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const ALLOWED_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp']

const uploadSchema = z.object({
  type: z.enum(['avatar', 'team-logo', 'image']),
})

/**
 * Validate file magic numbers to prevent MIME type spoofing
 */
async function validateFileSignature(buffer: Buffer): Promise<boolean> {
  // Check for valid image signatures (JPEG, PNG, WebP)
  const isJPEG = buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff
  const isPNG = buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47
  const isWebP = buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46
  
  return isJPEG || isPNG || isWebP
}

/**
 * Sanitize filename to prevent directory traversal
 */
function sanitizeFilename(filename: string): string {
  // Remove path separators and hidden files
  return filename
    .replace(/[\/\\]/g, '')
    .replace(/^\./, '')
    .toLowerCase()
}

async function POSTHandler(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File
    const type = formData.get('type') as string

    // Validate type parameter
    const validatedType = uploadSchema.parse({ type }).type

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    // Validate MIME type
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return NextResponse.json({ 
        error: 'Invalid file type. Only JPEG, PNG, and WebP are allowed' 
      }, { status: 400 })
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ 
        error: `File too large. Maximum size is ${MAX_FILE_SIZE / 1024 / 1024}MB` 
      }, { status: 400 })
    }

    // Convert file to buffer
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(new Uint8Array(bytes))

    // Validate file signature (prevent MIME type spoofing)
    const isValidSignature = await validateFileSignature(buffer)
    if (!isValidSignature) {
      return NextResponse.json({ 
        error: 'Invalid file format. File signature does not match expected image format' 
      }, { status: 400 })
    }

    // Sanitize filename
    const originalExtension = file.name.split('.').pop() || 'jpg'
    const sanitizedExtension = sanitizeFilename(originalExtension)
    
    // Validate extension
    if (!ALLOWED_EXTENSIONS.includes(sanitizedExtension)) {
      return NextResponse.json({ error: 'Invalid file extension' }, { status: 400 })
    }

    // Create upload directory if it doesn't exist
    await mkdir(UPLOAD_DIR, { recursive: true })

    // Generate unique filename with validated extension
    const fileName = `${uuidv4()}.${sanitizedExtension}`
    const filePath = join(UPLOAD_DIR, fileName)

    // Process image with sharp - RE-ENABLED
    let processedBuffer = buffer
    let outputFormat: string = sanitizedExtension

    try {
      if (validatedType === 'avatar') {
        // Resize and crop avatar to 200x200, convert to JPEG for consistency
        const metadata = await sharp(buffer).metadata()
        processedBuffer = Buffer.from(await sharp(buffer)
          .resize(200, 200, { fit: 'cover', position: 'center' })
          .jpeg({ quality: 90, progressive: true })
          .toBuffer()) as Buffer
        outputFormat = 'jpg'
      } else if (validatedType === 'team-logo') {
        // Resize team logo to max 300x300, maintain aspect ratio
        processedBuffer = Buffer.from(await sharp(buffer)
          .resize(300, 300, { fit: 'inside', withoutEnlargement: true })
          .jpeg({ quality: 90, progressive: true })
          .toBuffer()) as Buffer
        outputFormat = 'jpg'
      } else {
        // For general images, optimize but maintain format
        processedBuffer = Buffer.from(await sharp(buffer)
          .jpeg({ quality: 85, progressive: true })
          .toBuffer()) as Buffer
        outputFormat = 'jpg'
      }
    } catch (processError) {
      console.error('Image processing error:', processError)
      // If processing fails, use original buffer but still validate
      processedBuffer = buffer
    }

    // Save file
    await writeFile(filePath, processedBuffer as Buffer)

    const fileUrl = `/uploads/${fileName}`

    return NextResponse.json({
      url: fileUrl,
      fileName,
      size: processedBuffer.length,
      type: `image/${outputFormat}`,
      width: validatedType === 'avatar' ? 200 : undefined,
      height: validatedType === 'avatar' ? 200 : undefined,
    })
  } catch (error) {
    console.error('Upload error:', error)
    return handleError(error)
  }
}

// Wrap state-changing methods with CSRF protection
export const POST = withCSRF(POSTHandler)
