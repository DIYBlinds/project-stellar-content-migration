// upload.ts
import cloudinary from '../utils/cloudinary';
import showrooms from '../../.in/01-showrooms-cloudinary.json';
import fs from 'fs';

export const uploadImage = async (filePath: string, range: string, publicId: string, tags: string[]) => {
  try {
    const folder = `DIYblinds/Inspirations/Online Showrooms/${range}`;
    const result = await cloudinary.uploader.upload(filePath, {
      use_filename: true,
      unique_filename: false,
      overwrite: true,
      folder,
      public_id: publicId,
      resource_type: 'image',
    });
    
    await Promise.all(tags.map(async (tag) => {
      await cloudinary.uploader.add_tag(tag, [`${folder}/${publicId}`]);
    }));

    console.log('Upload success:', result.url);
    return result;
  } catch (error) {
    console.error('Upload error:', error);
    throw error;
  }
};

const getSlug = (url: string): string => {
  const segments = url.split('/').filter(Boolean);
  return segments[segments.length - 1];
};

const run = async () => {
  try {
    for (const showroom of showrooms) {
      if (showroom.cloudinaryImage != "") continue;
      const imagePath = `./.out/${showroom.range}/${getSlug(showroom.path)}`;
      const result = await uploadImage(imagePath, showroom.range, getSlug(showroom.path).replace('.jpg', ''), [showroom.space, showroom.range]);

      showroom.cloudinaryImage = result.url;
    }

    fs.writeFileSync('./.in/showrooms-cloudinary.json', JSON.stringify(showrooms, null, 2));
  } catch (error) {

    fs.writeFileSync('./.in/showrooms-cloudinary.json', JSON.stringify(showrooms, null, 2));
    console.error('Upload error:', error);
    throw error;
  }
}

run();

