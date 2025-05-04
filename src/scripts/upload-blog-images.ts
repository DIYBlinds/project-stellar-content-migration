// upload.ts
import cloudinary from '../utils/cloudinary';
import fs from 'fs';
import mappingsJson from '../../.in/image-mappings.json';
import showroomsJson from '../../.in/showrooms.json';
import blogs from '../../.in/blogs.json';


const mappings = mappingsJson as any[];
const showrooms = showroomsJson as any[];
interface Blog {
  title: string;
  heroImage: string;
  heroImageCloudinary?: string;
  contentBlocks: ContentBlock[];
}

interface ContentBlock {
  type: string;
  image?: string;
  imageCloudinary?: string;
  images?: string[];
  imagesCloudinary?: string[];
}

interface CloudinaryResult {
  url: string;
  [key: string]: any;
}

interface ImageUploadTask {
  filePath: string;
  publicId: string;
  folder: string;
  context: string[];
}

interface ImageMapping {
  blogTitle: string;
  originalImage: string;
  cloudinaryImage: string;
}

interface ProcessedImage {
  originalPath: string;
  cloudinaryUrl: string;
}

const CLOUDINARY_FOLDER = 'DIYblinds/Inspiration/DIY Blogs';

const getSlug = (url: string): string => {
  const segments = url.split('/').filter(Boolean);
  return segments[segments.length - 1];
};

const sanitizeFolderName = (title: string): string => {
  const INVALID_CHARS_REGEX = /[<>"/\\?*x]/g;
  return title.replace(':', '-').replace('|', '-').replace(INVALID_CHARS_REGEX, '');
};

const sanitizePublicId = (id: string): string => {
  // Remove file extensions
  const noExtension = id.replace(/\.(jpg|jpeg|png|gif)$/i, '');
  
  // Replace special characters with appropriate alternatives
  const replacements = [
    { pattern: /[‘']/g, replacement: '' }, // Remove smart quotes
    { pattern: /[#]/g, replacement: '' },  // Remove hash
    { pattern: /[:|]/g, replacement: '-' }, // Replace colon and pipe with hyphen
    { pattern: /&/g, replacement: 'and' }, // Replace ampersand with 'and'
    { pattern: /[<>"/\\?*x]/g, replacement: '' } // Remove other invalid characters
  ];

  return replacements.reduce(
    (result, { pattern, replacement }) => result.replace(pattern, replacement),
    noExtension
  );
};

const uploadImage = async (
  filePath: string,
  publicId: string,
  subFolder: string,
  context: string[] = []
): Promise<CloudinaryResult> => {
  try {
    const folder = `${CLOUDINARY_FOLDER}/${subFolder}`;
    // const randomString = Math.random().toString(36).substring(2, 9);
    // publicId = `${publicId}-${randomString}`;
    // Upload the image
    await cloudinary.uploader.upload(filePath, {
      use_filename: true,
      unique_filename: false,
      overwrite: true,
      folder,
      public_id: publicId,
      resource_type: 'image',
    });

    // Rename the image
    const result = await cloudinary.uploader.rename(
      `${folder}/${publicId}`,
      publicId
    );

    // Add tags and context
    await cloudinary.uploader.add_tag('Imported DIY Blog', [publicId]);
    if (context.length > 0) {
      await cloudinary.uploader.add_context(context.join('|'), [publicId]);
    }

    console.log('Upload success:', result.url);
    return result;
  } catch (error) {
    console.error('Upload error:', error);
    throw error;
  }
};

const collectImageTasks = (blog: Blog, folder: string): ImageUploadTask[] => {
  const tasks: ImageUploadTask[] = [];
  const processedImages = new Set<string>(mappings.map((mapping: any) => getSlug(mapping.originalImage)));

  // Add hero image task
  const heroImageSlug = getSlug(blog.heroImage);
  if (!processedImages.has(heroImageSlug)) {
    tasks.push({
      filePath: `./.in/blogs/${folder}/${heroImageSlug}`,
      publicId: sanitizePublicId(heroImageSlug),
      folder,
      context: ['Brand=DIY']
    });
    processedImages.add(heroImageSlug);
  }

  // Collect tasks from content blocks
  for (const block of blog.contentBlocks) {
    if (block.type === 'image' && block.image) {
      const imageSlug = getSlug(block.image);
      if (!processedImages.has(imageSlug)) {
        tasks.push({
          filePath: `./.in/blogs/${folder}/${imageSlug}`,
          publicId: sanitizePublicId(imageSlug),
          folder,
          context: ['Brand=DIY']
        });
        processedImages.add(imageSlug);
      }
    } else if (
      (block.type === 'contentTiles' || 
       block.type === 'gallery' || 
       block.type === 'imageCarousel') && 
      block.images
    ) {
      for (const image of block.images) {
        const imageSlug = getSlug(image);
        if (!processedImages.has(imageSlug)) {
          tasks.push({
            filePath: `./.in/blogs/${folder}/${imageSlug}`,
            publicId: sanitizePublicId(imageSlug),
            folder,
            context: ['Brand=DIY']
          });
          processedImages.add(imageSlug);
        }
      }
    }
  }

  return tasks;
};

const updateBlogWithUploadedImages = (
  blog: Blog,
  uploadResults: Map<string, CloudinaryResult>
): ImageMapping[] => {
  const imageMappings: ImageMapping[] = [];

  // Add hero image mapping
  const heroImageSlug = getSlug(blog.heroImage);
  const heroImageResult = uploadResults.get(heroImageSlug);
  if (heroImageResult) {
    imageMappings.push({
      blogTitle: blog.title,
      originalImage: blog.heroImage,
      cloudinaryImage: heroImageResult.url
    });
  }

  // Add content block image mappings
  for (const block of blog.contentBlocks) {
    if (block.type === 'image' && block.image) {
      const imageSlug = getSlug(block.image);
      const result = uploadResults.get(imageSlug);
      if (result) {
        imageMappings.push({
          blogTitle: blog.title,
          originalImage: block.image,
          cloudinaryImage: result.url
        });
      }
    } else if (
      (block.type === 'contentTiles' || 
       block.type === 'gallery' || 
       block.type === 'imageCarousel') && 
      block.images
    ) {
      for (const image of block.images) {
        const imageSlug = getSlug(image);
        const result = uploadResults.get(imageSlug);
        if (result) {
          imageMappings.push({
            blogTitle: blog.title,
            originalImage: image,
            cloudinaryImage: result.url
          });
        }
      }
    }
  }

  return imageMappings;
};

const saveProgress = (blogs: Blog[], imageMappings: ImageMapping[], index: number): void => {
  if (index % 10 === 0) {
    fs.writeFileSync('./.in/blogs.json', JSON.stringify(blogs, null, 2));
    fs.writeFileSync('./.in/image-mappings.json', JSON.stringify(imageMappings, null, 2));
  }
};

const run = async (): Promise<void> => {
  const allImageMappings: ImageMapping[] = [];
  const processedImages = new Map<string, ProcessedImage>();
  
  try {
    for (let index = 0; index < blogs.length; index++) {
      const blog = blogs[index];
      const folder = sanitizeFolderName(blog.title);
      
      // Collect all distinct image upload tasks for this blog
      const uploadTasks = collectImageTasks(blog, folder);
      const uploadResults = new Map<string, CloudinaryResult>();

      // Process all upload tasks
      for (const task of uploadTasks) {
        const imageSlug = getSlug(task.filePath);
        const existingImage = processedImages.get(imageSlug);
        const showroomImages = showrooms.filter((showroom: any) => showroom._source.cloudinaryImage.split('/').pop() == imageSlug);
        const showroomImage = showroomImages.length > 0 ? showroomImages[0] : null;
        
        if (existingImage || showroomImage) {
          // If image was already processed, use its existing URL
          uploadResults.set(imageSlug, { url: existingImage?.cloudinaryUrl ?? showroomImage?._source?.cloudinaryImage ?? ''});
          console.log(`Reusing existing image: ${imageSlug}`);
        } else {
          try {
            const result = await uploadImage(
              task.filePath,
              task.publicId,
              sanitizePublicId(task.folder),
              task.context
            );
            uploadResults.set(imageSlug, result);
            // Store the processed image for future use
            processedImages.set(imageSlug, {
              originalPath: task.filePath,
              cloudinaryUrl: result.url
            });
          } catch (error) {
            console.error(`Failed to upload image: ${task.filePath}`, error);
            // Continue with other images even if one fails
          }
        }
      }

      // Get image mappings for this blog
      const blogImageMappings = updateBlogWithUploadedImages(blog, uploadResults);
      allImageMappings.push(...mappings,...blogImageMappings);

      saveProgress(blogs, allImageMappings, index);
    }

    // Final save
    fs.writeFileSync('./.in/blogs.json', JSON.stringify(blogs, null, 2));
    fs.writeFileSync('./.in/image-mappings.json', JSON.stringify(allImageMappings, null, 2));
  } catch (error) {
    // Save progress even if there's an error
    fs.writeFileSync('./.in/blogs.json', JSON.stringify(blogs, null, 2));
    fs.writeFileSync('./.in/image-mappings.json', JSON.stringify(allImageMappings, null, 2));
    console.error('Upload error:', error);
    throw error;
  }
};

run().catch(console.error);

