// upload.ts
import cloudinary from '../utils/cloudinary';
import showrooms from '../../.in/01-showrooms-cloudinary.json';
import fs from 'fs';

export const uploadImage = async (filePath: string, range: string, publicId: string, tags: string[]) => {
  try {

    // console.log('Uploading image:', publicId);
    const folder = `DIYblinds/Products/Fabrics/${range}`;
    // const result = await cloudinary.uploader.upload(filePath, {
    //   use_filename: true,
    //   unique_filename: false,
    //   overwrite: true,
    //   folder,
    //   public_id: publicId,
    //   resource_type: 'image',
    // });

    console.log('Renaming image:', publicId);
    await cloudinary.uploader.rename(`${folder}/${publicId}`, `${publicId}`);

    // console.log('Adding tags to:', publicId);
    // await Promise.all(tags.map(async (tag) => {
    //   await cloudinary.uploader.add_tag(tag, [`${publicId}`]);
    // }));

    // console.log('Upload success:', result.url);
    // return result;
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

    // get all folders in .in/fabrics folder
    const fabrics = fs.readdirSync('./.in/fabrics');
    // get all files in each folder
    for (const fabric of fabrics) {
      const fabricPath = `./.in/fabrics/${fabric}`;
      const fabricImages = fs.readdirSync(fabricPath);
     
      for (const image of fabricImages) {
        const imagePath = `${fabricPath}/${image}`;

        // rename image file with following format: replace diyblinds- with fabric-
        const imageParts = image.split('--');
        const category = imageParts[0].replace('fabric-', '').charAt(0).toUpperCase() + imageParts[0].replace('fabric-', '').slice(1);
        let color = imageParts[2].replace('-', ' ').replace('.png', '');
        // upper case forst letter of each word
        color = color.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ').replace('Lf', 'LF').replace('Bo', 'BO');
                
        //console.log(imagePath, fabric, category, color);
        
        await uploadImage(imagePath, fabric, getSlug(image).replace('.png', ''), [category, fabric, color]);
      }
    }

  } catch (error) {

    console.error('Upload error:', error);
    throw error;
  }
}

run();

