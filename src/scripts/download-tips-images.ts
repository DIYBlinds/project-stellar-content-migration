import fs from 'fs';
import path from 'path';
import fetch from 'node-fetch';
import tips from '../../.in/tips.json';
import { logger } from '../utils/logger';

const imageFolderRoot = '.in/tips';

if (!fs.existsSync(imageFolderRoot)) {
  fs.mkdirSync(imageFolderRoot);
}

const getSlug = (url: string): string => {
  const segments = url.split('/').filter(Boolean);
  return segments[segments.length - 1];
};

const downloadImage = async (imgUrl: string, folder: string, filename: string): Promise<void> => {
  const response = await fetch(imgUrl);
  // regex to remove all invalid characters not valid as windows folder name
  const invalidChars = /[<>"/\\?*x]/g;
  const imageFolder = path.join(imageFolderRoot, folder.replace(':', '-').replace('|', '-').replace(invalidChars, ''));
  logger.info(`Downloading ${filename} to ${imageFolder}`);

  if (!fs.existsSync(imageFolder)) {
    fs.mkdirSync(imageFolder);
  }
  // check if file already exists
  if (fs.existsSync(path.join(imageFolder, filename))) {
    //logger.info(`Skipping ${filename} because it already exists.`);
    return;
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
  
  for (const tip of tips) {
    logger.info(`Downloading ${tip.url}`);
    await downloadImage( `https://media.diyblinds.com.au/${tip.heroImage}`, tip.title, getSlug(tip.heroImage));
    tip.contentBlocks?.forEach((block: any) => {
      if (block.type == 'image') {
        downloadImage( `https://media.diyblinds.com.au/${block.image}`, tip.title, getSlug(block.image));
      }
      if (block.type == 'contentTiles') {
        block.images.forEach((image: string) => {
          downloadImage( `https://media.diyblinds.com.au/${image}`, tip.title, getSlug(image));
        });
      }
      if (block.type == 'gallery') {
        block.images.forEach((image: string) => {
          downloadImage( `https://media.diyblinds.com.au/${image}`, tip.title, getSlug(image));
        });
      }
      if (block.type == 'imageCarousel') {
        block.slides.forEach((slide: any) => {
          slide.image != "" && downloadImage( `https://media.diyblinds.com.au/${slide.image}`, tip.title, getSlug(slide.image));
        });
      }
      if (block.type == 'splitContentFeature') {
        block.image1 != "" && downloadImage( `https://media.diyblinds.com.au/${block.image1}`, tip.title, getSlug(block.image1));
        block.image2 != "" && downloadImage( `https://media.diyblinds.com.au/${block.image2}`, tip.title, getSlug(block.image2));
      }
    });
  }
};

run();
