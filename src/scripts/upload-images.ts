// upload.ts
import cloudinary from '../utils/cloudinary';
import showrooms from '../../.in/showrooms.json';
import fs from 'fs';

export const uploadImage = async (filePath: string, publicId: string, context: string[]) => {
  try {
    const folder = `DIYblinds/Inspiration/Online Showroom`;
    await cloudinary.uploader.upload(filePath, {
      use_filename: true,
      unique_filename: false,
      overwrite: true,
      folder,
      public_id: publicId,
      resource_type: 'image',
    });

    const result = await cloudinary.uploader.rename(`${folder}/${publicId}`, `${publicId}`);

    if (context.length > 0) {
      await cloudinary.uploader.add_context(context.join('|'), [`${publicId}`]);
    }

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
    let index = 0;
    for (const showroom of showrooms) {
      if (showroom._source.cloudinaryImage != "") continue;
      const imagePath = `./.in/showrooms/${getSlug(showroom._source.path)}`;
      
      const context =[];
      (showroom._source.space ?? []).length > 0 && context.push('Room='+[...new Set((showroom._source.space ?? []))].join(','));
      (showroom._source.fabrics?.map(fabric => fabric.fabricName) ?? []).length > 0 &&  context.push('Fabric='+[...new Set((showroom._source.fabrics?.map(fabric => fabric.fabricName) ?? []))].join(','));
      (showroom._source.fabrics?.map(fabric => fabric.fabricColor) ?? []).length > 0 && context.push('Color='+[...new Set(showroom._source.fabrics?.map(fabric => fabric.fabricColor) ?? [])].join(','));
      (showroom._source.fabrics?.map(fabric => fabric.fabricGroupName) ?? []).length > 0 && context.push('FabricGroup='+[...new Set(showroom._source.fabrics?.map(fabric => fabric.fabricGroupName) ?? [])].join(','));
      (showroom._source.fabrics?.map(fabric => fabric.category) ?? []).length > 0 && context.push('Category='+[...new Set(showroom._source.fabrics?.map(fabric => fabric.category) ?? [])].join(','));
      (showroom._source.fabrics?.map(fabric => fabric.range) ?? []).length > 0 && context.push('Range='+[...new Set(showroom._source.fabrics?.map(fabric => fabric.range) ?? [])].join(','));
      
      const result = await uploadImage(imagePath, getSlug(showroom._source.path).replace('.jpg', ''), context);

      showroom._source.cloudinaryImage = result.url;

      if (index++ % 10 == 0) {
        fs.writeFileSync('./.in/showrooms.json', JSON.stringify(showrooms, null, 2));
      }
    }

    fs.writeFileSync('./.in/showrooms.json', JSON.stringify(showrooms, null, 2));
  } catch (error) {

    fs.writeFileSync('./.in/showrooms.json', JSON.stringify(showrooms, null, 2));
    console.error('Upload error:', error);
    throw error;
  }
}

run();

