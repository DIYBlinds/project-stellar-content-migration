import puppeteer, { Page } from 'puppeteer';
import blogsJson from '../../.in/blogs2.json'
import fs from 'fs';
import { Blog } from '../types/blog';
import { htmlToRichText } from 'html-to-richtext-contentful';

const blogs = blogsJson as Blog[];

const run = (async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  let index = 1;
  for (const blog of blogs) {
    try {
      console.log(index++, blog.url);
      await page.goto(blog.url, {
        waitUntil: 'domcontentloaded', // wait until all XHRs finish
      });
      // Now the page is fully rendered. You can extract HTML or run DOM queries.

      blog.title = await page.$eval('div.header__limit-title-width h1',  el => el.innerText);
      blog.heroImage = decodeBase64(await page.$eval('div.header--negative-feature-image img',  el => el.getAttribute('srcset')?.split(' ')[0] ?? ''));
      const contentBlocks = await page.$$('div.b');
      blog.contentBlocks = [];
      // convert below code to for loop
      for (const block of contentBlocks) {
        // text columns
        if (await page.evaluate(el => el.classList.contains('rich-block'), block) && (await block.$$('div.u-text-columns')).length > 0) {
          const html = await block.$eval('div.u-text-columns', el => el.innerHTML);

          blog.contentBlocks.push(
            {
              type: 'richText',
              content: htmlToRichText(html)
            }
          );
          continue;
        }

        // Richtext
        if (await page.evaluate(el => el.classList.contains('rich-block'), block)) {
          const html = await page.evaluate(el => el.innerHTML, block);

          blog.contentBlocks.push(
            {
              type: 'richText',
              content: htmlToRichText(html)
            }
          );
          continue;
        }

        // Content Tiles
        if ((await block.$$('ul.card-grid')).length > 0) {
          const images = (await block.$$eval('img', els => els.map(e => e.getAttribute('data-src')))).filter(Boolean);

          // get last part of image url
          const imageUrls = images.map(image => decodeBase64(image ?? ''));

          if (images.length > 0) {
            blog.contentBlocks.push({
              type: 'contentTiles',
              images: imageUrls
            });
          }
          continue;
        }

        // Image
        if ((await block.$$('div.image--center')).length > 0) {
          const image = await block.$eval('img', el => el.getAttribute('data-src') ?? '');
          if (image) {
            blog.contentBlocks.push({
              type: 'image',
              image: decodeBase64(image)
            });
          }
          continue;
        }

        // Image Carousel
        if ((await block.$$('div.image-carousel')).length > 0) {
          const images = await block.$$eval('img', els => els.map(e => e.getAttribute('data-srcset') ?? ''));
          if (images.length > 0) {
            blog.contentBlocks.push({
              type: 'imageCarousel',
              images: images.map(image => decodeBase64(image))
            });
          }
          continue;
        }

        // gallery 
        if ((await block.$$('section.gallery')).length > 0) {
          const images = await block.$$eval('img', els => els.map(e => e.getAttribute('data-src') ?? ''));
          if (images.length > 0) {
            blog.contentBlocks.push({
              type: 'gallery',
              images: images.map(image => decodeBase64(image))
            });
          }
          continue;
        }

        // Video
        if ((await block.$$('div.video__content')).length > 0) {
          const video = await block.$eval('div.video', el => el.getAttribute('data-youtube'));
          if (video) {
            blog.contentBlocks.push({
              type: 'video',
              youtube: `https://www.youtube.com/embed/${video}`
            });
          }
          continue;
        }

        // Text centered
        if ((await block.$$('div.lockup--ruled')).length > 0) {
          const title = await block.$eval('h3', el => el.innerText);
          const text = await block.$('div.u-text-center');
          
          if (title) {
            blog.contentBlocks.push({
              type: 'text-centered',
              title: title,
              //text: text ? await text.$eval('div', el => el.innerText) : ''
            });
          }
          continue;
        }
      }

      fs.writeFileSync('./.in/blogs2.json', JSON.stringify(blogs, null, 2));
    } catch (error) {
      fs.writeFileSync('./.in/blogs2.json', JSON.stringify(blogs, null, 2));
      console.log(error);
    }
  }

  fs.writeFileSync('./.in/blogs2.json', JSON.stringify(blogs, null, 2));
  await browser.close();
});


const decodeBase64 = (cdnImageUrl: string) => {
  try {
    const base64 = cdnImageUrl.split('/').pop() ?? '';
    const decoded = Buffer.from(base64, 'base64').toString('utf8');
    return JSON.parse(decoded)?.key;
  } catch (error) {
    console.log(error);
    return cdnImageUrl;
  }
}

run();