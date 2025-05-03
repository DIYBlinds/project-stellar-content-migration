import blogs from '../../.in/blogs.json';
import inclusions from '../../.in/blog-inclusuins.json';
import { upsertEntry } from '../utils/contentful';
import mappings from '../../.in/blog-image-mappings.json';

const LOCALE = 'en-AU';
const samples = ['https://www.diyblinds.com.au/inspiration/hunting-for-george-two-outstanding-projects-using-motorisation-and-smart-home-automation'];
const imports = blogs.filter(blog => inclusions.includes(blog.url));//.filter(blog => samples.includes(blog.url));
console.log('imports', inclusions.filter(url => !blogs.map(blog => blog.url).includes(url)));

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
    for (const blog of imports) {
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
        if (block.type === 'video') {
            await createVideoBlock(blog, block);
        }
        if (block.type === 'headline') {
            await createHeadlineBlock(blog, block);
        }
        if (block.type === 'gallery') {
            await createGalleryBlock(blog, block);
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
                [LOCALE]: blog.contentBlocks?.filter((block: any) => !['imageCarousel'].includes(block.type)).map((block: any) => {
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

const createGalleryBlock = async (blog: typeof blogs[0], block: any) => {

    const cells = [];
    let index = 0;
    const count = block.images.length;
    let colSpan = 1;
    let rowSpan = 1;
    for (const image of block.images) {
        if (count === 4 || count === 7) {
            rowSpan = index === 0 || index === 2 ? 2 : 1;
        }

        const cell = await createCell(blog, image, colSpan, rowSpan);
        if (cell) {
            cells.push(cell);
        }
        index++;
    }

    return await upsertEntry('featuredGrid', `${block.type.toLowerCase()}-${block.id}`, {
        metadata: metadata,
        fields: {
            name: {
                [LOCALE]: 'Blog > ' + blog.title
            },
            variant: {
                [LOCALE]: 'default'
            },
            cells: {
                [LOCALE]: cells.filter(Boolean).map((cell: any) => {
                    return {
                        sys: {
                            type: 'Link',
                            linkType: 'Entry',
                            id: cell.sys.id
                        }
                    }
                })
            }
        }
    });
}

const createCell = async (blog: typeof blogs[0], image: string, colSpan: number, rowSpan: number) => {
    const cloudinaryImage = lookupImage(blog.title, image)
    if (!cloudinaryImage) return null;
    return await upsertEntry('featuredGridCell', `cell-${cloudinaryImage.id}`, {
        metadata: metadata,
        fields: {
            name: {
                [LOCALE]: getSlug(cloudinaryImage.image)
            },
            variant: {
                [LOCALE]: 'gallery-tout'
            },
            image: {
                [LOCALE]: cloudinaryImage.image
            },
            columnSpan: {
                [LOCALE]: colSpan
            },
            rowSpan: {
                [LOCALE]: rowSpan
            }
        }
    });
}

const createHeadlineBlock = async (blog: typeof blogs[0], block: any) => {
    return await upsertEntry('headline', `${block.type.toLowerCase()}-${block.id}`, {
        metadata: metadata,
        fields: {
            name: {
                [LOCALE]: 'Blog > ' + block.title
            },
            title: {
                [LOCALE]: block.title
            },
            subTitle: {
                [LOCALE]: block.description
            }
        }
    });
}

const createVideoBlock = async (blog: typeof blogs[0], block: any) => {
    return await upsertEntry('video', `${block.type.toLowerCase()}-${block.id}`, {
        metadata: metadata,
        fields: {
            name: { 
                [LOCALE]: 'Blog > ' + blog.title
            },
            video: {
                [LOCALE]: block.youtube
            },
            autoPlay: {
                [LOCALE]: false
            },
            loop: {
                [LOCALE]: false
            }
        }
    });
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

//run();