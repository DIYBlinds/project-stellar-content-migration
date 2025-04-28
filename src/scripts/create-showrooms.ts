import path from 'path';
import showrooms from '../../.in/showrooms.json';
import { upsertEntry } from '../utils/contentful';
const LOCALE = 'en-AU';

const run = async () => {
    for (const showroom of showrooms) {
        const heroImage = await upsertHeroImage(showroom);
        upsertShowroom(showroom, heroImage.sys.id);
    }
}

const getSlug = (url: string): string => {
    const segments = url.split('/').filter(Boolean);
    const slug = segments[segments.length - 1];

    // remove file extension and replace all dots to dashes
    return slug.replace(/\.[^.]+$/, '').replace(/\./g, '-').replace(/\@/g, '');
};
const upsertHeroImage = async (showroom: typeof showrooms[0]) => {
    const heroImageEntry = await upsertEntry('heroImage', `heroimage-showroom-${showroom._id}`, {
        metadata: {
            tags: [
                {
                    sys: {
                        type: 'Link',
                        linkType: 'Tag',
                        id: "showroom"
                    }
                }
            ]
        },
        fields: {
            title: {
                [LOCALE]: `Showroom Image > ${getSlug(showroom._source.path)}`
            },
            image: {
                [LOCALE]: showroom._source.cloudinaryImage
            }
        }
    }); 
    return heroImageEntry;
}

const upsertShowroom = async (showroom: typeof showrooms[0], heroImageId: string) => {
    const loc = showroom._source.location && `Location: ${showroom._source.location}`;
    const photographer = showroom._source.photographer && `Photographer: ${showroom._source.photographer}`;
    const tags = [loc, photographer].filter(Boolean);

    const data = {
        metadata: {
            tags: [
                {
                    sys: {
                        type: 'Link',
                        linkType: 'Tag',
                        id: "showroom"
                    }
                }
            ]
        },
        fields: {
            name: {
                [LOCALE]: `Showroom > ${getSlug(showroom._source.path)}` 
            },
            title: {
                [LOCALE]: showroom._source.title
            },
            articleType: {
                [LOCALE]: 'Online showroom'
            },
            slug: {
                [LOCALE]: `/diyblinds/online-showrooms/${getSlug(showroom._source.path)}`
            },
            thumbnail: {
                [LOCALE]: showroom._source.cloudinaryImage
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
            space: {
                [LOCALE]: showroom._source.space
            },
            colorGroup: {
                [LOCALE]: [...new Set(showroom._source.fabrics?.filter(fabric => fabric.fabricColorVariantKey)?.map(fabric => fabric.colorGroup))]
            },
            productCategory: {
                [LOCALE]: [... new Set(showroom._source.fabrics?.filter(fabric => fabric.fabricColorVariantKey)?.map(fabric => fabric.category))]
            },
            productSubCategory: {
                [LOCALE]: [... new Set(showroom._source.fabrics?.filter(fabric => fabric.fabricColorVariantKey)?.map(fabric => fabric.range))]
            },
            productKeys: {
                [LOCALE]: [...new Set(showroom._source.fabrics?.filter(fabric => fabric.fabricColorVariantKey)?.map(fabric => fabric.fabricColorVariantKey))]
            },
            tags: {
                [LOCALE]: tags
            },
            
            text: {
                [LOCALE]: {
                    data: {},
                    content: [
                        {
                            data: {},
                            content: [
                                {
                                    data: {},
                                    marks: [],
                                    value: showroom._source.description,
                                    nodeType: "text"
                                }
                            ],
                            nodeType: "paragraph"
                        }
                    ],
                    nodeType: "document"
                }
            }
            
        }
    }

    await upsertEntry('inspiration', showroom._id, data);
}

run();
