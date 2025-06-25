import rollerBlinds from '../../.in/roller-blinds.json'
import venetianBlinds from '../../.in/venetian.json'
import verticalBlinds from '../../.in/vertical-blinds.json'
import romanBlinds from '../../.in/roman-blinds.json'
import curtains from '../../.in/curtains.json'
import { upsertEntry } from '../utils/contentful'
import { Fabric, FabricColour } from '../types/product'
import fs from 'fs';
const data = [...curtains,...romanBlinds, ...venetianBlinds, ...verticalBlinds,...rollerBlinds]

const LOCALE = 'en-AU';
const metadata = {
    tags: [
        {
            sys: {
                type: 'Link',
                linkType: 'Tag',
                id: "product"
            }
        }
    ]
}

const helper = async () => {
    for(const fabricColour of data) {
        (fabricColour as any).slug = `/diyblinds/blinds/${fabricColour.productKey}`;
        (fabricColour as any).faqTags = ['Curtains','Curtains|Single'];


        (fabricColour as any).ref = `ref-${fabricColour.productKey.split('--')[0]}`;
        (fabricColour as any).refVariant = `${(fabricColour as any).ref}-${fabricColour.fabricKey.split('--')[1]}`;
        // extract minWidth and maxWidth from width property using regex
        const width = (fabricColour as any).width;
        
        const minWidth = width.match(/min: (\d+)mm/)?.[1];
        const maxWidth = width.match(/max: (\d+)mm/)?.[1];
        (fabricColour as any).minWidth = minWidth;
        (fabricColour as any).maxWidth = maxWidth;

        // extract minDrop and maxDrop from drop property using regex
        const drop = (fabricColour as any).drop;
        const minDrop = drop.match(/min: (\d+)mm/)?.[1];
        const maxDrop = drop.match(/max: (\d+)mm/)?.[1];
        (fabricColour as any).minDrop = minDrop;
        (fabricColour as any).maxDrop = maxDrop;
    }

    // save the data to a file
    fs.writeFileSync('.in/curtains.json', JSON.stringify(data, null, 2));
}

const run = async () => {
    // for(const fabricColour of data) {
    //     await upsertFabricColour(fabricColour)
    // }

    // ransform fabricColours into Fabrics by groupping by fabricKey    
    const fabrics = data.reduce<Record<string, Fabric>>((acc, fabricColour) => {
        acc[fabricColour.productKey] = acc[fabricColour.productKey] || [];
        const fabric = acc[fabricColour.productKey]
        if (!fabric.fabricColourKeys) {
            fabric.fabricColourKeys = [];
        }
        fabric.productKey = fabricColour.productKey;
        fabric.fabricColourKeys.push(fabricColour.fabricColourKey);
        fabric.longHeadline = fabricColour.longHeadline;
        fabric.fabricKey = fabricColour.fabricKey;
        fabric.slug = fabricColour.slug;
        fabric.faqTags = fabricColour.faqTags;
        fabric.tagLine = fabricColour.tagLine;
        return acc;
    }, {});

    for(const fabricKey in fabrics) {
        //await upsertFabric(fabrics[fabricKey])
        await upsertProduct(fabrics[fabricKey])
    }
}

const upsertFabricColour = async (fabricColour: FabricColour) => {
    const colour = fabricColour.fabricColourKey.split('--').pop()
    const id = `fc--${fabricColour.productKey}--${colour}`
    const data = {
        metadata: metadata,
        fields: {
            name: {
                [LOCALE]: id
            },
            fabricColourKey: {
                [LOCALE]: fabricColour.fabricColourKey
            },
            title: {
                [LOCALE]: fabricColour.longHeadline
            },
            shortDescription    : {
                [LOCALE]: toRichtext(fabricColour.shortDescription)
            },
            longDescription: {
                [LOCALE]: toRichtext(fabricColour.longDescription)
            }
           
        }
    }

    await upsertEntry('fabricColour', id, data);
}

const upsertFabric = async (fabric: Fabric) => {
    const id = `f--${fabric.productKey}`
    const data = {
        metadata: metadata,
        fields: {
            name: {
                [LOCALE]: id
            },
            fabricKey: {
                [LOCALE]: fabric.fabricKey
            },
            title: {
                [LOCALE]: fabric.longHeadline
            },
            fabricColours: {
                [LOCALE]: fabric.fabricColourKeys.map((fabricColourKey) => {    
                    const colour = fabricColourKey.split('--').pop()
                    return {
                        sys: {
                            type: 'Link',
                            linkType: 'Entry',
                            id: `fc--${fabric.productKey}--${colour}`
                        }
                    }
                })
            }
        }
    }

    await upsertEntry('fabric', id, data);
}

const upsertProduct = async (fabric: Fabric) => {

    const data = {
        metadata: metadata,
        fields: {
            productKey: {
                [LOCALE]: fabric.productKey
            },
            slug: {
                    [LOCALE]: fabric.slug
                },
            tagLine: {
                [LOCALE]: fabric.tagLine
            },
            fabric: {
                [LOCALE]: {
                    sys: {
                        type: 'Link',
                        linkType: 'Entry',
                        id: `f--${fabric.productKey}`
                        }
                    }
            },
            faqTags: {
                [LOCALE]: fabric.faqTags
            },
            configurator: {
                [LOCALE]: {
                    sys: {
                        type: 'Link',
                        linkType: 'Entry',
                        id: '4IRImZS6n9w1T6uaqieqko'
                    }
                }
            },
            configuration: {
                [LOCALE]: {}
            }
        }
        
    }

    await upsertEntry('preConfiguredProduct', fabric.productKey, data);
}

const toRichtext = (text: string) => {
    return {
        data: {},
        content: [
            {
                data: {},
                content: [
                {
                  nodeType: "text",
                  value: text,
                  marks: [],
                  data: {}
                }
              ],
              nodeType: "paragraph"
            }
        ],
        nodeType: "document"
    }
}

run()
//helper()