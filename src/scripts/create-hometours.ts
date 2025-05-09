import tours from '../../.in/hometours.json';
import { upsertEntry } from '../utils/contentful';
import mappings from '../../.in/image-mappings.json';

const LOCALE = 'en-AU';
const samples = [

];
const excludes = [

];

const imports = tours.splice(0, 1) //.filter(tour => samples.includes(tour.url));
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
                [LOCALE]: `tour > ${getSlug(tour.heroImage)}`
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
    console.log(title, url);
    const mapping = (mappings as any).find((mapping: any) => mapping.tourTitle === title && mapping.originalImage === url);
    return {
        image: mapping?.cloudinaryImage.replace(/%40/g, '@'),
        id: mapping?.id
    }
}

const upserttours = async (tour: typeof tours[0], heroImageId: string) => {

    const blocks = []
    for (const block of tour.contentBlocks) {
        if (block.type === 'richText') {
            await createRichTextBlock(tour, block);
        }   
        if (block.type === 'contentTiles') {
            await createContentTilesBlock(tour, block);
        }
        if (block.type === 'image') {
            await createImageBlock(tour, block);
        }
        if (block.type === 'video') {
            await createVideoBlock(tour, block);
        }
        if (block.type === 'headline') {
            await createHeadlineBlock(tour, block);
        }
        if (block.type === 'gallery') {
            await createGalleryBlock(tour, block);
        }
        if (block.type === 'fancyImagePanel') {
            await createSplitContentFeatureBlock(tour, block);
        }
    }

    const data = {
        metadata: metadata,
        fields: {
            name: {
                [LOCALE]: tour.title
            },
            title: {
                [LOCALE]: tour.title
            },
            articleType: {
                [LOCALE]: 'DIY tour'
            },
            slug: {
                [LOCALE]: `/diyblinds/tours/${getSlug(tour.url)}`
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
                [LOCALE]: tour.contentBlocks?.filter((block: any) => !['imageCarousel'].includes(block.type)).map((block: any) => {
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

    await upsertEntry('inspiration', 'tour-'+tour.id, data);
}

const createSplitContentFeatureBlock = async (tour: typeof tours[0], block: any) => {
    return await upsertEntry('splitContentFeature', `feature-${block.id}`, {
        metadata: metadata,
        fields: {
            name: {
                [LOCALE]: 'tour > ' + tour.title
            },
            leftBlockImage: {
                [LOCALE]: block.flipped ? lookupImage(tour.title, block.image2)?.image : lookupImage(tour.title, block.image1)?.image
            },
            rightBlockImage: {
                [LOCALE]: block.flipped ? lookupImage(tour.title, block.image1)?.image : lookupImage(tour.title, block.image2)?.image
            },
            rightBlockText: {
                [LOCALE]: !block.flipped && toRichtext(block.copy) 
            },
            leftBlockText: {
                [LOCALE]: block.flipped && toRichtext(block.copy) 
            },
            rightBlickTitle: {
                [LOCALE]: !block.flipped && block.caption
            },
            leftBlockTitle: {
                [LOCALE]: block.flipped && block.caption
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

    const cells = [];
    let index = 0;
    const count = block.images.length;
    let colSpan = 1;
    let rowSpan = 1;
    for (const image of block.images) {
        if (count === 4 || count === 7) {
            rowSpan = index === 0 || index === 2 ? 2 : 1;
        }

        const cell = await createCell(tour, image, colSpan, rowSpan);
        if (cell) {
            cells.push(cell);
        }
        index++;
    }

    return await upsertEntry('featuredGrid', `${block.type.toLowerCase()}-${block.id}`, {
        metadata: metadata,
        fields: {
            name: {
                [LOCALE]: 'tour > ' + tour.title
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

const createCell = async (tour: typeof tours[0], image: string, colSpan: number, rowSpan: number) => {
    const cloudinaryImage = lookupImage(tour.title, image)
    if (!cloudinaryImage) return null;
    console.log('CELL>>>>', cloudinaryImage.image);
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

const createHeadlineBlock = async (tour: typeof tours[0], block: any) => {
    return await upsertEntry('headline', `${block.type.toLowerCase()}-${block.id}`, {
        metadata: metadata,
        fields: {
            name: {
                [LOCALE]: 'tour > ' + block.title
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

const createVideoBlock = async (tour: typeof tours[0], block: any) => {
    return await upsertEntry('video', `${block.type.toLowerCase()}-${block.id}`, {
        metadata: metadata,
        fields: {
            name: { 
                [LOCALE]: 'tour > ' + tour.title
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
                [LOCALE]: 'Image > ' + tour.title
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
                [LOCALE]: 'tour > ' + tour.title
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
                [LOCALE]: 'tour > ' + tour.title
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
                [LOCALE]: 'tour > Content Tiles > ' + tour.title
            },
            image: {
                [LOCALE]: coundinaryImage.image 
            }
        }
    }

    return await upsertEntry('tile', 'tile-'+coundinaryImage.id, tile);
}

run();