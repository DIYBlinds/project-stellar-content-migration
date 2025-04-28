// upload.ts
import cloudinary from '../utils/cloudinary';
import showrooms from '../../.in/showrooms.json';
import shoroomExclusions from '../../.in/shoroom-exclusions.json';
import fs from 'fs';

const imports = showrooms.filter(showroom => !shoroomExclusions.includes(+showroom._id));

const getSlug = (url: string): string => {
  const segments = url.split('/').filter(Boolean);
  return segments[segments.length - 1];
};

const run = async () => {
  const fixList = imports.filter(showroom => showroom._source.cloudinaryImage.includes('%40'));
  try {
    for (const showroom of fixList) {
      const publicId = getSlug(showroom._source.path);
      const newPublicId = getSlug(showroom._source.path).replace('.png', '');
      //const result = await cloudinary.uploader.rename(`${publicId}`, `${newPublicId}`);

      showroom._source.cloudinaryImage = showroom._source.cloudinaryImage.replace('%40', '@');
      console.log(showroom._source.cloudinaryImage);
    }

    fs.writeFileSync('./.in/showrooms-fixed.json', JSON.stringify(fixList, null, 2));
    fs.writeFileSync('./.in/showrooms.json', JSON.stringify(showrooms, null, 2));
  } catch (error) {

    fs.writeFileSync('./.in/showrooms-fixed.json', JSON.stringify(fixList, null, 2));
    fs.writeFileSync('./.in/showrooms.json', JSON.stringify(showrooms, null, 2));
    console.error('Upload error:', error);
    throw error;
  }
}

run();

