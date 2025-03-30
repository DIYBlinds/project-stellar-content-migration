import puppeteer, { Page } from 'puppeteer';
import showroomsJson from '../../.in/03-showrooms-text-scrapped.json';
import { Showroom } from '../types/showroom';
import fs from 'fs';

const showrooms = showroomsJson as Showroom[];

const run = (async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  let index = 1;
  for (const showroom of showrooms.slice(0, 1)) { 
    if (showroom.fabrics !== "") {
      console.log(index++, showroom._id, showroom.fabrics);
      continue;
    }
    try {
      await page.goto(`https://www.diyblinds.com.au/inspiration/online-showroom/919683`, {
        waitUntil: 'networkidle0', // wait until all XHRs finish
      });
  
    
      // Now the page is fully rendered. You can extract HTML or run DOM queries.
      await page.$$eval('span.tc--cadet-blue', el => el.map(e => e.remove()));
      await page.$$eval('div.product-list__item-actions', el => el.map(e => e.remove()));
      const content = (await page.$$eval('div.product-list__item-content',  el => el.map(e => e.textContent?.trim().split("\n").map(e => e.trim()).join(" > ")))).join("|");

      showroom.fabrics = content;
      console.log(index++, showroom._id, content);
      // if (index % 100 === 0) {
      //   fs.writeFileSync('./.in/showrooms-final.json', JSON.stringify(showrooms, null, 2));
      // }
    } catch (error) {
      //fs.writeFileSync('./.in/showrooms-final.json', JSON.stringify(showrooms, null, 2));
      console.log(error);
    }
  }

  //fs.writeFileSync('./.in/showrooms-final.json', JSON.stringify(showrooms, null, 2));
  await browser.close();
});


run();