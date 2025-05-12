import blogs from '../../.in/blogs.json';
import { upsertEntry } from '../utils/contentful';
import mappings from '../../.in/image-mappings.json';
import inclusions from '../../.in/blog-inclusions.json';
const LOCALE = 'en-AU';
const samples = [

];
const excludes = [

];

const imports = blogs.filter((blog) => inclusions.includes(blog.url)).splice(20, 10);
console.log('imports>>>', imports.length);

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
        console.log('blog>>>',blog.title);
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
                [LOCALE]: `DIY Blog > ${blog.title} > ${getSlug(blog.heroImage)}`
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
    let mapping = (mappings as any).find((mapping: any) => mapping.blogTitle === title && mapping.originalImage === url);
    if (!mapping) {
        mapping = (mappings as any).find((mapping: any) => getSlug(mapping.originalImage) === getSlug(url));
    }

    return {
        image: mapping?.cloudinaryImage.replace(/%40/g, '@'),
        id: mapping?.id
    }
}

const upsertBlogs = async (blog: typeof blogs[0], heroImageId: string) => {

    const blocks = []
    for (const block of blog.contentBlocks) {
        if (block.type === 'richText') {
            const entry = await createRichTextBlock(blog, block);
            blocks.push(entry.sys.id);
        }   
        if (block.type === 'contentTiles') {
            const entry = await createContentTilesBlock(blog, block);
            blocks.push(entry.sys.id);
        }
        if (block.type === 'image') {
            const entry = await createImageBlock(blog, block);
            blocks.push(entry.sys.id);
        }
        if (block.type === 'video') {
            const entry = await createVideoBlock(blog, block);
            blocks.push(entry.sys.id);
        }
        if (block.type === 'headline') {
            const entry = await createHeadlineBlock(blog, block);
            blocks.push(entry.sys.id);
        }
        if (block.type === 'gallery') {
            const entries = await createGalleryBlock(blog, block);
            blocks.push(...entries.map((entry: any) => entry.sys.id));
        }
        if (block.type === 'splitContentFeature') {
            const entry = (block as any).image1 !== "" ? await createSplitContentFeatureBlock(blog, block) : await createContentFeatureBlock(blog, block);
            blocks.push(entry.sys.id);
        }
        if (block.type === 'imageCarousel') {
            const entry = await createImageCarouselBlock(blog, block);
            blocks.push(entry.sys.id);
        }
    }

    const data = {
        metadata: metadata,
        fields: {
            name: {
                [LOCALE]: `DIY Blog > ${blog.title}`
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
                [LOCALE]: blocks.map((blockId: any) => {
                    return {
                        sys: {
                            type: 'Link',
                            linkType: 'Entry',
                            id: `${blockId}`
                        }
                    }
                })
            }
        }
    }

    await upsertEntry('inspiration', 'blog-'+blog.id, data);
}

const createImageCarouselBlock = async (blog: typeof blogs[0], block: any) => {

    const tiles = [];
    for (const slide of block.slides) {
        const tile = await createSlide(blog, slide, slide.text)
        if (tile) {
            tiles.push({
                sys: {
                    type: 'Link',
                    linkType: 'Entry',
                    id: tile.sys.id
                }
            })
        }
    }

    return await upsertEntry('tilesBlock', `imagecarousel-${block.id}`, {
        metadata: metadata,
        fields: {
            name: {
                [LOCALE]: `DIY Blog > ${blog.title} > Image Carousel`
            },
            variant: {
                [LOCALE]: 'carousel'
            },
            tiles: {
                [LOCALE]: tiles
            }
        }
    });
}

const createContentFeatureBlock = async (blog: typeof blogs[0], block: any) => {
    return await upsertEntry('contentFeature', `contentfeature-${block.id}`, {
        metadata: metadata,
        fields: {
            name: {
                [LOCALE]: `DIY Blog > ${blog.title} > ${block.title}`
            },
            title: {
                [LOCALE]: block.title
            },
            text: {
                [LOCALE]: toRichtext(block.copy) 
            },
            image: {
                [LOCALE]: lookupImage(blog.title, block.image2)?.image
            },
            flipLayout: {
                [LOCALE]: block.flipped ? true : false
            }
        }
    });
}

const createSplitContentFeatureBlock = async (blog: typeof blogs[0], block: any) => {
    let leftBlock = {
        leftBlockTitle: {
            [LOCALE]: undefined
        },
        leftBlockImage: {
            [LOCALE]: (block.flipped ? lookupImage(blog.title, block.image2)?.image : lookupImage(blog.title, block.image1)?.image)
        },
        leftBlockText: {
            [LOCALE]: undefined
        }
    }

    const rightBlock = {
        rightBlockTitle: {
            [LOCALE]: block.caption
        },
        rightBlockImage: {
            [LOCALE]: (block.flipped ? lookupImage(blog.title, block.image1)?.image : lookupImage(blog.title, block.image2)?.image)
        },
        rightBlockText: {
            [LOCALE]: toRichtext(block.copy) 
        }
    }

    return await upsertEntry('splitContentFeature', `${block.type.toLowerCase()}-${block.id}`, {
        metadata: metadata,
        fields: {
            name: {
                [LOCALE]: `DIY Blog > ${blog.title} > ${block.caption}`
            },
            ...leftBlock,
            ...rightBlock,
            flipLayout: {
                [LOCALE]: block.flipped ? true : false
            }
        }
    });
}

const toRichtext = (text: string) => {
    return {
        nodeType: "document",
        data: {},
        content: [
          {
            nodeType: "paragraph",
            data: {},
            content: [
              {
                nodeType: "text",
                value: text,
                marks: [],
                data: {}
              }
            ]
          }
        ]
    }
}

const createGalleryBlock = async (blog: typeof blogs[0], block: any) => {
    const entries = [];
    const sets: Record<number, string[]> = {};
    const IMAGES_PER_GROUP = 28;
    
    // Create groups of images without modifying the original array
    const imageGroups = Array.from({ length: Math.ceil(block.images.length / IMAGES_PER_GROUP) }, (_, i) => 
        block.images.slice(i * IMAGES_PER_GROUP, (i + 1) * IMAGES_PER_GROUP)
    );
    
    // Convert groups to sets object
    imageGroups.forEach((group, index) => {
        sets[index] = group;
    });

    let groupId = 1;
    for (const set of Object.values(sets)) {
        let count = set.length;
        let colSpan = 1;
        let rowSpan = 1;
        let index = 0;
        const cells = [];

        for (const image of set) {
           
            rowSpan = [0, 2, 7, 9, 14, 16, 21, 23].includes(index) ? 2 : 1;
    
            const cell = await createCell(blog, image, colSpan, rowSpan);
            if (cell) {
                cells.push(cell);
            }
            index++;
        }
    
        const entry = await upsertEntry('featuredGrid', `gallery-${block.id}-${groupId++}`, {
            metadata: metadata,
            fields: {
                name: {
                    [LOCALE]: `DIY Blog > ${blog.title} > Image Gallery`
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
        entries.push(entry);
    }    
    return entries;
}

const createCell = async (blog: typeof blogs[0], image: string, colSpan: number, rowSpan: number) => {
    const cloudinaryImage = lookupImage(blog.title, image)
    if (!cloudinaryImage) return null;
    return await upsertEntry('featuredGridCell', `cell-${cloudinaryImage.id}`, {
        metadata: metadata,
        fields: {
            name: {
                [LOCALE]: `DIY Blog > ${blog.title} > Gallery Image > ${getSlug(cloudinaryImage.image)}`
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
                [LOCALE]: `DIY Blog > ${blog.title}`
            },
            title: {
                [LOCALE]: block.title
            },
            subTitle: {
                [LOCALE]: block.description
            },
            text: {
                [LOCALE]: toRichtext(block.text)
            }
        }
    });
}

const createVideoBlock = async (blog: typeof blogs[0], block: any) => {
    return await upsertEntry('video', `${block.type.toLowerCase()}-${block.id}`, {
        metadata: metadata,
        fields: {
            name: { 
                [LOCALE]: `DIY Blog > ${blog.title}`
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
                [LOCALE]: `DIY Blog > ${blog.title}`
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
                [LOCALE]: `DIY Blog > ${blog.title}`
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
                [LOCALE]: `DIY Blog > ${blog.title}`
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

    return await upsertEntry('contentTiles', `${block.type.toLowerCase()}-${block.id}`, data);
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
                [LOCALE]: `DIY Blog > ${blog.title} > ${getSlug(coundinaryImage.image)}`
            },
            image: {
                [LOCALE]: coundinaryImage.image 
            }
        }
    }

    return await upsertEntry('tile', 'tile-'+coundinaryImage.id, tile);
}

const createSlide = async (blog: typeof blogs[0], slide: any, text: any) => {    
    const coundinaryImage = lookupImage(blog.title, slide.image);

    if (!coundinaryImage) {
        console.log('no image found for:', slide.image);
        return null;
    }
    const tile = {
        metadata: metadata,
        fields: {
            name: {
                [LOCALE]: `DIY Blog > ${blog.title} > ${getSlug(coundinaryImage.image)}`
            },
            image: {
                [LOCALE]: coundinaryImage.image 
            },
            text: {
                [LOCALE]: text
            }
        }
    }

    return await upsertEntry('tile', 'tile-'+slide.id, tile);
}

run();