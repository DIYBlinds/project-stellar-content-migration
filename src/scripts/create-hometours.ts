import tours from '../../.in/hometours.json';
import { upsertEntry } from '../utils/contentful';
import mappings from '../../.in/image-mappings.json';

const LOCALE = 'en-AU';
const samples = [

];
const excludes = [

];

const imports = tours //.filter(tour => samples.includes(tour.url));
console.log('imports>>>', imports.length);

const metadata = {
    tags: [
        {
            sys: {
                type: 'Link',
                linkType: 'Tag',
                id: "homeTour"
            }
        }
    ]
}

const run = async () => {
    for (const tour of imports) {
        console.log('tour>>>',tour.title);
        const heroImage = await upsertHeroImage(tour);
        await upserttours(tour, heroImage.sys.id);
    }
}

const getSlug = (url: string): string => {
    const segments = url.split('/').filter(Boolean);
    const slug = segments[segments.length - 1];

    // remove file extension and replace all dots to dashes
    return slug.replace(/\.[^.]+$/, '').replace(/\./g, '-').replace(/\@/g, '');
};

const upsertHeroImage = async (tour: typeof imports[0]) => {
    const heroImageEntry = await upsertEntry('heroImage', `heroimage-tour-${tour.id}`, {
        metadata: metadata,
        fields: {
            name: {
                [LOCALE]: `Home Tour > ${tour.title} > ${getSlug(tour.heroImage)}`
            },
            title: {
                [LOCALE]: `${tour.title}`
            },
            image: {
                [LOCALE]: lookupImage(tour.title, tour.heroImage)?.image
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

const upserttours = async (tour: typeof tours[0], heroImageId: string) => {

    const blocks = []
    for (const block of tour.contentBlocks) {
        if (block.type === 'richText') {
            const entry = await createRichTextBlock(tour, block);
            blocks.push(entry.sys.id);
        }   
        if (block.type === 'contentTiles') {
            const entry = await createContentTilesBlock(tour, block);
            blocks.push(entry.sys.id);
        }
        if (block.type === 'image') {
            const entry = await createImageBlock(tour, block);
            blocks.push(entry.sys.id);
        }
        if (block.type === 'video') {
            const entry = await createVideoBlock(tour, block);
            blocks.push(entry.sys.id);
        }
        if (block.type === 'headline') {
            const entry = await createHeadlineBlock(tour, block);
            blocks.push(entry.sys.id);
        }
        if (block.type === 'gallery') {
            const entries = await createGalleryBlock(tour, block);
            blocks.push(...entries.map((entry: any) => entry.sys.id));
        }
        if (block.type === 'splitContentFeature') {
            const entry = block.image1 !== "" ? await createSplitContentFeatureBlock(tour, block) : await createContentFeatureBlock(tour, block);
            blocks.push(entry.sys.id);
        }
        if (block.type === 'imageCarousel') {
            const entry = await createImageCarouselBlock(tour, block);
            blocks.push(entry.sys.id);
        }
    }

    const data = {
        metadata: metadata,
        fields: {
            name: {
                [LOCALE]: `Home Tour > ${tour.title}`
            },
            title: {
                [LOCALE]: tour.title
            },
            articleType: {
                [LOCALE]: 'Home tour'
            },
            slug: {
                [LOCALE]: `/diyblinds/home-tours/${getSlug(tour.url)}`
            },
            thumbnail: {
                [LOCALE]: lookupImage(tour.title, tour.heroImage)?.image 
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

    await upsertEntry('inspiration', 'home-tour-'+tour.id, data);
}

const createImageCarouselBlock = async (tour: typeof tours[0], block: any) => {

    const tiles = [];
    for (const slide of block.slides) {
        const tile = await createSlide(tour, slide, slide.text)
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
                [LOCALE]: `Home Tour > ${tour.title} > Image Carousel`
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

const createContentFeatureBlock = async (tour: typeof tours[0], block: any) => {
    return await upsertEntry('contentFeature', `contentfeature-${block.id}`, {
        metadata: metadata,
        fields: {
            name: {
                [LOCALE]: `Home Tour > ${tour.title} > ${block.title}`
            },
            title: {
                [LOCALE]: block.title
            },
            text: {
                [LOCALE]: toRichtext(block.copy) 
            },
            image: {
                [LOCALE]: lookupImage(tour.title, block.image2)?.image
            },
            flipLayout: {
                [LOCALE]: block.flipped ? true : false
            }
        }
    });
}

const createSplitContentFeatureBlock = async (tour: typeof tours[0], block: any) => {
    let leftBlock = {
        leftBlockTitle: {
            [LOCALE]: undefined
        },
        leftBlockImage: {
            [LOCALE]: (block.flipped ? lookupImage(tour.title, block.image2)?.image : lookupImage(tour.title, block.image1)?.image)
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
            [LOCALE]: (block.flipped ? lookupImage(tour.title, block.image1)?.image : lookupImage(tour.title, block.image2)?.image)
        },
        rightBlockText: {
            [LOCALE]: toRichtext(block.copy) 
        }
    }

    return await upsertEntry('splitContentFeature', `${block.type.toLowerCase()}-${block.id}`, {
        metadata: metadata,
        fields: {
            name: {
                [LOCALE]: `Home Tour > ${tour.title} > ${block.caption}`
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

const createGalleryBlock = async (tour: typeof tours[0], block: any) => {
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
    
            const cell = await createCell(tour, image, colSpan, rowSpan);
            if (cell) {
                cells.push(cell);
            }
            index++;
        }
    
        const entry = await upsertEntry('featuredGrid', `gallery-${block.id}-${groupId++}`, {
            metadata: metadata,
            fields: {
                name: {
                    [LOCALE]: `Home Tour > ${tour.title} > Image Gallery`
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

const createCell = async (tour: typeof tours[0], image: string, colSpan: number, rowSpan: number) => {
    const cloudinaryImage = lookupImage(tour.title, image)
    if (!cloudinaryImage) return null;
    return await upsertEntry('featuredGridCell', `cell-${cloudinaryImage.id}`, {
        metadata: metadata,
        fields: {
            name: {
                [LOCALE]: `Home Tour > ${tour.title} > Gallery Image > ${getSlug(cloudinaryImage.image)}`
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

const createHeadlineBlock = async (tour: typeof tours[0], block: any) => {
    return await upsertEntry('headline', `${block.type.toLowerCase()}-${block.id}`, {
        metadata: metadata,
        fields: {
            name: {
                [LOCALE]: `Home Tour > ${tour.title} > ${block.title}`
            },
            title: {
                [LOCALE]: block.title
            },
            subTitle: {
                [LOCALE]: block.description
            },
            text: {
                [LOCALE]: block.richText
            }
        }
    });
}

const createVideoBlock = async (tour: typeof tours[0], block: any) => {
    return await upsertEntry('video', `${block.type.toLowerCase()}-${block.id}`, {
        metadata: metadata,
        fields: {
            name: { 
                [LOCALE]: `Home Tour > ${tour.title}`
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

const createImageBlock = async (tour: typeof tours[0], block: any) => { 
    return await upsertEntry('heroImage', `${block.type.toLowerCase()}-${block.id}`, {
        metadata: metadata,
        fields: {
            name: {
                [LOCALE]: `Home Tour > ${tour.title}`
            },
            title: {
                [LOCALE]: tour.title
            },
            image: {
                [LOCALE]: lookupImage(tour.title, block.image)?.image
            }
        }
    });
}

const createRichTextBlock = async (tour: typeof tours[0], block: any) => {
    return await upsertEntry('richText', `${block.type.toLowerCase()}-${block.id}`, {
        metadata: metadata,
        fields: {
            name: {
                [LOCALE]: `Home Tour > ${tour.title}`
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

const createContentTilesBlock = async (tour: typeof tours[0], block: any) => {
    const tiles = [];
    for(const image of block.images) {
        const tile = await createTile(tour, image);
        if (tile) {
            tiles.push(tile);
        }
    }

    const data = {
        metadata: metadata,
        fields: {
            name: {
                [LOCALE]: `Home Tour > ${tour.title}`
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

const createTile = async (tour: typeof tours[0], image: string) => {    
    const coundinaryImage = lookupImage(tour.title, image);

    if (!coundinaryImage) {
        console.log('no image found for:', image);
        return null;
    }
    const tile = {
        metadata: metadata,
        fields: {
            name: {
                [LOCALE]: `Home Tour > ${tour.title} > ${getSlug(coundinaryImage.image)}`
            },
            image: {
                [LOCALE]: coundinaryImage.image 
            }
        }
    }

    return await upsertEntry('tile', 'tile-'+coundinaryImage.id, tile);
}

const createSlide = async (tour: typeof tours[0], slide: any, text: any) => {    
    const coundinaryImage = lookupImage(tour.title, slide.image);

    if (!coundinaryImage) {
        console.log('no image found for:', slide.image);
        return null;
    }
    const tile = {
        metadata: metadata,
        fields: {
            name: {
                [LOCALE]: `Home Tour > ${tour.title} > ${getSlug(coundinaryImage.image)}`
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