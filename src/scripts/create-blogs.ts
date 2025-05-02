import blogs from '../../.in/blogs.json';
import exclusions from '../../.in/blog-exclusions.json';
import { upsertEntry } from '../utils/contentful';
import mappings from '../../.in/blog-image-mappings.json';
import { generateId } from '../utils/id';

const LOCALE = 'en-AU';
import fs from 'fs';
const imports = blogs.filter(blog => !exclusions.map(exclusion => exclusion.url).includes(blog.url));


const metadata = {
    tags: [
        {
            sys: {
                type: 'Link',
                linkType: 'Tag',
                id: "blog"
            }
        }
    ]
}

const run = async () => {
    for (const blog of imports.slice(10, 11)) {
        const heroImage = await upsertHeroImage(blog);
        await upsertBlogs(blog, heroImage.sys.id);
    }
}

const getSlug = (url: string): string => {
    const segments = url.split('/').filter(Boolean);
    const slug = segments[segments.length - 1];

    // remove file extension and replace all dots to dashes
    return slug.replace(/\.[^.]+$/, '').replace(/\./g, '-').replace(/\@/g, '');
};

const upsertHeroImage = async (blog: typeof imports[0]) => {
    const heroImageEntry = await upsertEntry('heroImage', `heroimage-blog-${blog.id}`, {
        metadata: metadata,
        fields: {
            name: {
                [LOCALE]: `Blog > ${getSlug(blog.heroImage)}`
            },
            title: {
                [LOCALE]: `${blog.title}`
            },
            image: {
                [LOCALE]: lookupImage(blog.title, blog.heroImage)?.image
            }
        }
    }); 
    return heroImageEntry;
}

const lookupImage = (title : string, url: string) => {
    const mapping = (mappings as any).find((mapping: any) => mapping.blogTitle === title && mapping.originalImage === url);
    return {
        image: mapping.cloudinaryImage.replace(/%40/g, '@'),
        id: mapping.id
    }
}

const upsertBlogs = async (blog: typeof blogs[0], heroImageId: string) => {

    const blocks = []
    for (const block of blog.contentBlocks) {
        if (block.type === 'richText') {
            await createRichTextBlock(blog, block);
        }   
        if (block.type === 'contentTiles') {
            await createContentTilesBlock(blog, block);
        }
        if (block.type === 'image') {
            await createImageBlock(blog, block);
        }
    }

    const data = {
        metadata: metadata,
        fields: {
            name: {
                [LOCALE]: blog.title
            },
            title: {
                [LOCALE]: blog.title
            },
            articleType: {
                [LOCALE]: 'DIY blog'
            },
            slug: {
                [LOCALE]: `/diyblinds/blogs/${getSlug(blog.url)}`
            },
            thumbnail: {
                [LOCALE]: lookupImage(blog.title, blog.heroImage)?.image 
            },
            heroImage: {
                [LOCALE]: {
                    sys: {
                        type: 'Link',
                        linkType: 'Entry',
                        id: heroImageId
                    }
                }
            },
            publishedDate: {
                [LOCALE]: new Date().toISOString()
            },
            brand: {
                [LOCALE]: 'DIY'
            },
            contentBlocks: {
                [LOCALE]: blog.contentBlocks?.filter((block: any) => !['imageCarousel', 'gallery'].includes(block.type)).map((block: any) => {
                    return {
                        sys: {
                            type: 'Link',
                            linkType: 'Entry',
                            id: `${block.type.toLowerCase()}-${block.id}`
                        }
                    }
                })
            }
        }
    }

    await upsertEntry('inspiration', 'blog-'+blog.id, data);
}

const createImageBlock = async (blog: typeof blogs[0], block: any) => { 
    return await upsertEntry('heroImage', `${block.type.toLowerCase()}-${block.id}`, {
        metadata: metadata,
        fields: {
            name: {
                [LOCALE]: 'Image > ' + blog.title
            },
            title: {
                [LOCALE]: blog.title
            },
            image: {
                [LOCALE]: lookupImage(blog.title, block.image)?.image
            }
        }
    });
}

const createRichTextBlock = async (blog: typeof blogs[0], block: any) => {
    return await upsertEntry('richText', `${block.type.toLowerCase()}-${block.id}`, {
        metadata: metadata,
        fields: {
            name: {
                [LOCALE]: 'Blog > ' + blog.title
            },
            textAlignment: {
                [LOCALE]: 'left'
            },
            text: {
                [LOCALE]: block.content
            },
            hasGlossary: {
                [LOCALE]: false
            }
        }
    });
}

const createContentTilesBlock = async (blog: typeof blogs[0], block: any) => {
    const tiles = [];
    for(const image of block.images) {
        const tile = await createTile(blog, image);
        if (tile) {
            tiles.push(tile);
        }
    }

    const data = {
        metadata: metadata,
        fields: {
            name: {
                [LOCALE]: 'Blog > ' + blog.title
            },
            columnLayout: {
                [LOCALE]: 'two'
            },
            tiles: {
                [LOCALE]: tiles.map((tile: any) => {
                    return {
                        sys: {
                            type: 'Link',
                            linkType: 'Entry',
                            id: tile.sys.id
                        }
                    }
                })  
            }
        }
    }

    await upsertEntry('contentTiles', `${block.type.toLowerCase()}-${block.id}`, data);
}

const createTile = async (blog: typeof blogs[0], image: string) => {    
    const coundinaryImage = lookupImage(blog.title, image);

    if (!coundinaryImage) {
        console.log('no image found for:', image);
        return null;
    }
    const tile = {
        metadata: metadata,
        fields: {
            name: {
                [LOCALE]: 'Blog > Content Tiles > ' + blog.title
            },
            image: {
                [LOCALE]: coundinaryImage.image 
            }
        }
    }

    return await upsertEntry('tile', 'tile-'+coundinaryImage.id, tile);
}

run();