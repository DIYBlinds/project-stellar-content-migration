import fs from 'fs';
import path from 'path';
import fetch from 'node-fetch';
import showrooms from '../../.in/showrooms.json';
import { logger } from '../utils/logger';


const imageFolder = '.in/showrooms';

if (!fs.existsSync(imageFolder)) {
  fs.mkdirSync(imageFolder);
}

const getSlug = (url: string): string => {
  const segments = url.split('/').filter(Boolean);
  return segments[segments.length - 1];
};

const downloadImage = async (imgUrl: string, filename: string): Promise<void> => {
  const response = await fetch(imgUrl);

  const fileStream = fs.createWriteStream(path.join(imageFolder, filename));

  return new Promise((resolve, reject) => {
    if (!response.body) return reject('No image body to download.');
    response.body.pipe(fileStream);
    response.body.on('error', reject);
    fileStream.on('finish', resolve);
    fileStream.on('error', reject);
  });
};



const run = async () => {
  
  for (const showroom of showrooms) {
    logger.info(`Downloading ${showroom._source.path}`);
    await downloadImage( `https://media.diyblinds.com.au${showroom._source.path}`, getSlug(showroom._source.path));
  }
};

run();
