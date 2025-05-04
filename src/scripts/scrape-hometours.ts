import puppeteer, { Page } from 'puppeteer';
import toursJson from '../../.in/hometours.json'
import fs from 'fs';
import { HomeTour } from '../types/home-tour';
import { htmlToRichText } from 'html-to-richtext-contentful';

const tours = toursJson as HomeTour[];

const run = (async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  let index = 1;
  for (const tour of tours) {
    try {
      console.log(index++, tour.url);
      await page.goto(tour.url, {
        waitUntil: 'domcontentloaded', // wait until all XHRs finish
      });
      // Now the page is fully rendered. You can extract HTML or run DOM queries.

      tour.title = await page.$eval('div.header__title h1',  el => el.innerText);
      tour.heroImage = decodeBase64(await page.$eval('div.header--hero',  el => el.getAttribute('data-bgset') ?? ''));
      // delete shortDescription property from tour object if exists
      if (tour.shortDescription) {
        delete tour.shortDescription;
      } 
      const contentBlocks = await page.$$('div.b');
      tour.contentBlocks = [];

      for (const block of contentBlocks) {
        // text columns
        // if (await page.evaluate(el => el.classList.contains('rich-block'), block) && (await block.$$('div.u-text-columns')).length > 0) {
        //   const html = await block.$eval('div.u-text-columns', el => el.innerHTML);

        //   tour.contentBlocks.push(
        //     {
        //       type: 'richText',
        //       content: htmlToRichText(html)
        //     }
        //   );
        //   continue;
        // }

        // // Richtext
        // if (await page.evaluate(el => el.classList.contains('rich-block'), block)) {
        //   const html = await page.evaluate(el => el.innerHTML, block);

        //   tour.contentBlocks.push(
        //     {
        //       type: 'richText',
        //       content: htmlToRichText(html)
        //     }
        //   );
        //   continue;
        // }

        // Content Tiles
        if ((await block.$$('div.two-images')).length > 0) {
          if (await tryGet(() => block.$('ul.card-grid'))) {
            const images = (await block.$$eval('img', els => els.map(e => e.getAttribute('data-src')))).filter(Boolean);
            console.log('images>>>>', images);
            // get last part of image url
            const imageUrls = images.map(image => decodeBase64(image ?? ''));

            if (images.length > 0) {
              tour.contentBlocks.push({
                type: 'contentTiles',
                images: imageUrls
              });
            }
          } else {
            const image1 = await tryGet(() => block.$eval('figure.image--full img', el => el.getAttribute('data-src') ?? ''));
            const image2 = await tryGet(() => block.$eval('figure.image--bg', el => el.getAttribute('data-bgset') ?? ''));
  
            // get last part of image url
            const image1Url = decodeBase64(image1 ?? '');
            const image2Url = decodeBase64(image2 ?? '');
  
            
            tour.contentBlocks.push({
              type: 'contentTiles',
              images: [image1Url, image2Url]
            });
          }
          
          continue;
        }

        // // Image
        // if ((await block.$$('div.image--center')).length > 0) {
        //   const image = await block.$eval('img', el => el.getAttribute('data-src') ?? '');
        //   if (image) {
        //     tour.contentBlocks.push({
        //       type: 'image',
        //       image: decodeBase64(image)
        //     });
        //   }
        //   continue;
        // }

        // // Image Carousel
        // if ((await block.$$('div.image-carousel')).length > 0) {
        //   const images = await block.$$eval('img', els => els.map(e => e.getAttribute('data-srcset') ?? ''));
        //   if (images.length > 0) {
        //     tour.contentBlocks.push({
        //       type: 'imageCarousel',
        //       images: images.map(image => decodeBase64(image))
        //     });
        //   }
        //   continue;
        // }

        // gallery 
        if ((await block.$$('section.gallery')).length > 0) {
          const images = await block.$$eval('img', els => els.map(e => e.getAttribute('data-src') ?? ''));
          if (images.length > 0) {
            tour.contentBlocks.push({
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
            tour.contentBlocks.push({
              type: 'video',
              youtube: `https://www.youtube.com/embed/${video}`
            });
          }
          continue;
        }

        // Headline
        if (await page.evaluate(el => el.classList.contains('title-block'), block)) {
          const title = await tryGet(() => block.$eval('h3', el => el.innerText))
          const text = await tryGet(() => block.$eval('div.text', el => el.innerText))
          
          if (title) {
            tour.contentBlocks.push({
              type: 'headline',
              title: title,
              description: text
            });
          }
          continue;
        }

        // Fancy image panel
        if ((await block.$$('div.fancy-image-panel')).length > 0) {
          const image1 = await tryGet(() => block.$eval('div.fancy-image-panel__extra figure', el => el.getAttribute('data-bgset') ?? ''));
          const image2 = await tryGet(() => block.$eval('div.fancy-image-panel__main img', el => el.getAttribute('data-src') ?? ''));
          const caption = await tryGet(() => block.$eval('div.fancy-image-panel__caption h3', el => el.innerText));
          const copy = await tryGet(() => block.$eval('div.image-caption__copy', el => el.innerText));
          
          tour.contentBlocks.push({
            type: 'fancyImagePanel',
            image1: image1 ? decodeBase64(image1) : '',
            image2: image2 ? decodeBase64(image2) : '',
            caption: caption,
            copy: copy
          });
          
          continue;
        }
      }

      fs.writeFileSync('./.in/hometours.json', JSON.stringify(tours, null, 2));
    } catch (error) {
      fs.writeFileSync('./.in/hometours.json', JSON.stringify(tours, null, 2));
      console.log(error);
    }
  }

  fs.writeFileSync('./.in/hometours.json', JSON.stringify(tours, null, 2));
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

const tryGet = async (func: () => Promise<any>) => {
  try {
    return await func();
  } catch (error) {
    return '';
  }
}

run();