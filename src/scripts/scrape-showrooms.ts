import puppeteer, { Page } from 'puppeteer';
import showroomsJson from '../../.in/02-showrooms-content.json';
import { Showroom } from '../types/showroom';
import fs from 'fs';

const showrooms = showroomsJson as Showroom[];

const run = (async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  let index = 1;
  for (const showroom of showrooms) {
    if (showroom.content !== "" && showroom.content) continue;
    try {
    await page.goto(`https://www.diyblinds.com.au/inspiration/online-showroom/${showroom._id}`, {
      waitUntil: 'networkidle0', // wait until all XHRs finish
    });
  
    
      // Now the page is fully rendered. You can extract HTML or run DOM queries.
      const content = await page.$eval('div.image-detail__content-body',  el => el.innerHTML);

      showroom.content = content;
      console.log(index++, showroom._id);
      if (index % 100 === 0) {
        fs.writeFileSync('./.in/showrooms-content.json', JSON.stringify(showrooms, null, 2));
      }
    } catch (error) {
      fs.writeFileSync('./.in/showrooms-content.json', JSON.stringify(showrooms, null, 2));
      console.log(error);
    }
  }

  fs.writeFileSync('./.in/showrooms-content.json', JSON.stringify(showrooms, null, 2));
  await browser.close();
});


run();