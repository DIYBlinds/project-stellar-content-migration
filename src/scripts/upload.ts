import cloudinary from '../utils/cloudinary';

export interface CloudinaryResult {
    url: string;
    [key: string]: any;
}

export const uploadImage = async (
    cloudinaryFolder: string,
    filePath: string,
    publicId: string,
    context: string[] = []
  ): Promise<CloudinaryResult> => {
    try {
      const folder = `${cloudinaryFolder}`;
      publicId = sanitizePublicId(publicId);
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
      //console.log(filePath)
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
      await cloudinary.uploader.add_tag('Imported', [publicId]);
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

  export const sanitizePublicId = (id: string): string => {
    // Remove file extensions
    const noExtension = id.replace(/\.(jpg|jpeg|png|gif)$/i, '');
    
    // Replace special characters with appropriate alternatives
    const replacements = [
      { pattern: /[‘']/g, replacement: '' }, // Remove smart quotes
      { pattern: /[#]/g, replacement: '' },  // Remove hash
      { pattern: /[:|]/g, replacement: '-' }, // Replace colon and pipe with hyphen
      { pattern: /&/g, replacement: 'and' }, // Replace ampersand with 'and'
    ];
  
    return replacements.reduce(
      (result, { pattern, replacement }) => result.replace(pattern, replacement),
      noExtension
    );
  };