import puppeteer, { Page } from 'puppeteer';
import blogsJson from '../../.in/blogs.json'
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
      console.log('done');
      // Now the page is fully rendered. You can extract HTML or run DOM queries.

      blog.title = await page.$eval('div.header__limit-title-width h1',  el => el.innerText);
      blog.heroImage = await page.$eval('div.header--negative-feature-image img',  el => el.getAttribute('srcset')?.split(' ')[0] ?? '');
      const contentBlocks = await page.$$('div.b');
      blog.contentBlocks = [];
      // convert below code to for loop
      for (const block of contentBlocks) {
        // if block has css class 'rich-block' then convert to rich text
        if (await page.evaluate(el => el.classList.contains('rich-block'), block)) {
          const html = await page.evaluate(el => el.innerHTML, block);

          blog.contentBlocks.push(
            {
              type: 'richText',
              content: htmlToRichText(html)
            }
          );
        }

        // if block has css class 'card-grid' then add images to content blocks
        if (await block.$$('ul.card-grid')) {
          const images = (await block.$$eval('img', els => els.map(e => e.getAttribute('data-src')))).filter(Boolean);

          // get last part of image url
          const imageUrls = images.map(image => decodeBase64(image ?? ''));

          if (images.length > 0) {
            blog.contentBlocks.push({
              type: 'contentTiles',
              images: imageUrls
            });
          }
        }
      }

      fs.writeFileSync('./.in/blogs.json', JSON.stringify(blogs, null, 2));
    } catch (error) {
      fs.writeFileSync('./.in/blogs.json', JSON.stringify(blogs, null, 2));
      console.log(error);
    }
  }

  fs.writeFileSync('./.in/blogs.json', JSON.stringify(blogs, null, 2));
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