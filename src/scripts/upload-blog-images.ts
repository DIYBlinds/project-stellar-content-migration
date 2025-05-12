// upload.ts
import cloudinary from '../utils/cloudinary';
import fs from 'fs';
import mappingsJson from '../../.in/image-mappings.json';
import blogs from '../../.in/blogs.json';


const mappings = mappingsJson as any[];
interface Blog {
  title: string;
  heroImage: string;
  contentBlocks: ContentBlock[];
}

interface ContentBlock {
  type: string;
  image?: string;
  imageCloudinary?: string;
  images?: string[];
  imagesCloudinary?: string[];
  image1?: string;
  image2?: string;
  slides?: {
    image: string;
    text: string;
  }[];
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
  type?: string;
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
    const existingImages = await cloudinary.api.resources({
      type: 'upload',
      folder,
      max_results: 1000
    });
    const existingImageIds = existingImages.resources.map((image: any) => { return { publicId: image.public_id, url: image.url } });
    const existingImage = existingImageIds.find((image: any) => image.publicId === publicId);
    if (existingImage) {
      console.log(`Image already exists: ${publicId}`);
      return { url: existingImage.url };
    }
    
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
       block.type === 'gallery') && 
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
    } else if (block.type === 'splitContentFeature') {
      for (const image of [block.image1, block.image2]) {
        if (image && image !== "") {
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
    } else if (block.type === 'imageCarousel') {
    for (const slide of (block as any).slides) {
      const imageSlug = getSlug(slide.image);
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
    if (block.type == 'richText') {
      const docuemnt = (block as any).content
      for (const content of docuemnt.content) {
        if (!content.nodeType && content.content[0].nodeType == 'embedded-asset-block') {
          const embeddedAsset = content.content[0] as any;
          const imageSlug = getSlug(embeddedAsset.data.target.fields.file.url);
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
      cloudinaryImage: heroImageResult.url,
      type: 'blog'
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
          cloudinaryImage: result.url,
          type: 'blog'
        });
      }
    } else if (
      (block.type === 'contentTiles' || 
       block.type === 'gallery') && 
      block.images
    ) {
      for (const image of block.images) {
        const imageSlug = getSlug(image);
        const result = uploadResults.get(imageSlug);
        if (result) {
          imageMappings.push({
            blogTitle: blog.title,
            originalImage: image,
            cloudinaryImage: result.url,
            type: 'blog'
          });
        }
      }
    } else if (block.type === 'splitContentFeature') {
      for (const image of [block.image1, block.image2]) {
        if (image && image !== "") {
          const imageSlug = getSlug(image);
          const result = uploadResults.get(imageSlug);
          if (result) {
              imageMappings.push({
                blogTitle: blog.title,
              originalImage: image,
              cloudinaryImage: result.url,
              type: 'blog'
            });
          }
        }
      }
    } else if (block.type === 'imageCarousel') {
      for (const slide of (block as any).slides) {
        const imageSlug = getSlug(slide.image);
        const result = uploadResults.get(imageSlug);
        if (result) {
          imageMappings.push({  
            blogTitle: blog.title,
            originalImage: slide.image,
            cloudinaryImage: result.url,
            type: 'blog'
          });
        }
      }
    }
    if (block.type == 'richText') {
      const docuemnt = (block as any).content
      for (const content of docuemnt.content) {
        if (!content.nodeType && content.content[0].nodeType == 'embedded-asset-block') {
          const embeddedAsset = content.content[0] as any;
          const imageSlug = getSlug(embeddedAsset.data.target.fields.file.url);
          const result = uploadResults.get(imageSlug);
          if (result) {
            imageMappings.push({
              blogTitle: blog.title,
              originalImage: embeddedAsset.data.target.fields.file.url,
              cloudinaryImage: result.url,
              type: 'blog'
            });
          }
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
  const allImageMappings: ImageMapping[] = [...mappings];
  const processedImages = new Map<string, ProcessedImage>();
  
  try {
    for (let index = 0; index < blogs.length; index++) {
      const blog = blogs[index];

      const folder = sanitizeFolderName(blog.title);
      
      // Collect all distinct image upload tasks for this blog
      const uploadTasks = collectImageTasks(blog as any, folder);
      const uploadResults = new Map<string, CloudinaryResult>();

      // Process all upload tasks
      for (const task of uploadTasks) {
        const imageSlug = getSlug(task.filePath);
        const existingImage = processedImages.get(imageSlug);
        
        if (existingImage) {
          // If image was already processed, use its existing URL
          uploadResults.set(imageSlug, { url: existingImage?.cloudinaryUrl ?? ''});
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
      const blogImageMappings = updateBlogWithUploadedImages(blog as any, uploadResults);
      allImageMappings.push(...blogImageMappings);

      saveProgress(blogs as any, allImageMappings, index);
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

