import fs from 'fs';
import path from 'path';
import fetch from 'node-fetch';
import blogs from '../../.in/blogs.json';
import { logger } from '../utils/logger';

const imageFolderRoot = '.in/blogs';

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

  if (!fs.existsSync(imageFolder)) {
    fs.mkdirSync(imageFolder);
  }
  // check if file already exists
  if (fs.existsSync(path.join(imageFolder, filename))) {
    //logger.info(`Skipping ${filename} because it already exists.`);
    return;
  }
  logger.info(`Downloading ${filename} to ${imageFolder}`);

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
  
  for (const blog of blogs) {
    logger.info(`blog>>> ${blog.url}`);
    await downloadImage( `https://media.diyblinds.com.au/${blog.heroImage}`, blog.title, getSlug(blog.heroImage));
    for(const contentBlock of blog.contentBlocks) {
      const block = contentBlock as any;
      if (block.type == 'image') {
        await downloadImage( `https://media.diyblinds.com.au/${block.image}`, blog.title, getSlug(block.image));
      }
      if (block.type == 'contentTiles') {
        block.images.forEach(async (image: string) => {
          await downloadImage( `https://media.diyblinds.com.au/${image}`, blog.title, getSlug(image));
        });
      }
      if (block.type == 'gallery') {
        block.images.forEach(async (image: string) => {
          await downloadImage( `https://media.diyblinds.com.au/${image}`, blog.title, getSlug(image));
        });
      }
      if (block.type == 'imageCarousel') {
        block.slides.forEach(async (slide: any) => {
          await downloadImage( `https://media.diyblinds.com.au/${slide.image}`, blog.title, getSlug(slide.image));
        });
      }
      if (block.type == 'richText') {
        const docuemnt = block.content
        for (const content of docuemnt.content) {
          if (!content.nodeType && content.content[0].nodeType == 'embedded-asset-block') {
            const embeddedAsset = content.content[0] as any;
            console.log('embeddedAsset>>>>>>', blog.title, embeddedAsset.data.target.fields.file.url);
            await downloadImage( `https://media.diyblinds.com.au/${embeddedAsset.data.target.fields.file.url}`, blog.title, getSlug(embeddedAsset.data.target.fields.file.url));
          }
        }
      }
    }
  }
};

run();
