import { config as dotenvConfig } from 'dotenv';
const environment = dotenvConfig({
    path: 'C:/Projects/diy-blinds-migration/src/.env'
  });


export const config = {
  environment: process.env.NODE_ENV || 'development',
  // Add other configuration options here
  CONTENTFUL_SPACE_ID: process.env.CONTENTFUL_SPACE_ID!,
  CONTENTFUL_ACCESS_TOKEN: process.env.CONTENTFUL_ACCESS_TOKEN!,
  CONTENTFUL_HOST: process.env.CONTENTFUL_HOST!,
  CONTENTFUL_ENVIRONMENT: process.env.CONTENTFUL_ENVIRONMENT!,
}; 