// lib/cloudinary.ts
import { config as dotenvConfig } from 'dotenv';
dotenvConfig({
  path: '../../.env'
});

import { v2 as cloudinary } from 'cloudinary';


cloudinary.config({
  cloud_name: 'dj7xmqwpi',//process.env.CLOUDINARY_CLOUD_NAME!,
  api_key: '837594288828928',//process.env.CLOUDINARY_API_KEY!,
  api_secret: 'nFeSgVIzZxA0eGrPM3BaHEBBSgE',//process.env.CLOUDINARY_API_SECRET!,
  secure: true
});

export default cloudinary;
