import fs from 'fs';
import path from 'path';
import fetch from 'node-fetch';
import showrooms from '../../.in/00-showrooms-data.json';
import { logger } from '../utils/logger';


const outputFolder = '.out';

if (!fs.existsSync(outputFolder)) {
  fs.mkdirSync(outputFolder);
}

const getSlug = (url: string): string => {
  const segments = url.split('/').filter(Boolean);
  return segments[segments.length - 1];
};

const downloadImage = async (imgUrl: string, filename: string, folder: string): Promise<void> => {
  const response = await fetch(imgUrl);
  const imageFolder = path.join(outputFolder, folder);
  if (!fs.existsSync(imageFolder)) {
    fs.mkdirSync(imageFolder);
  }

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
    logger.info(`Downloading ${showroom.path}`);
    await downloadImage(showroom.path, getSlug(showroom.path), showroom.range);
  }
};

run();
