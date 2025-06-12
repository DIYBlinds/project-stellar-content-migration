import rollerBlinds from '../../.in/roller-blinds.json'
import { upsertEntry } from '../utils/contentful'
import { Fabric, FabricColour } from '../types/product'
import fs from 'fs';
const data = [...rollerBlinds]

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
        (fabricColour as any).faqTags = ['Blinds|Roller'];
    }

    // save the data to a file
    fs.writeFileSync('.in/roller-blinds.json', JSON.stringify(data, null, 2));
}

const createFabrics = async () => {
    for(const fabricColour of data) {
        await upsertFabricColour(fabricColour)
    }

    // ransform fabricColours into Fabrics by groupping by fabricKey    
    const fabrics = data.reduce<Record<string, Fabric>>((acc, fabricColour) => {
        acc[fabricColour.fabricKey] = acc[fabricColour.fabricKey] || [];
        const fabric = acc[fabricColour.fabricKey]
        if (!fabric.fabricColourKeys) {
            fabric.fabricColourKeys = [];
        }
        fabric.productKey = fabricColour.productKey;
        fabric.fabricColourKeys.push(fabricColour.fabricColourKey);
        fabric.longHeadline = fabricColour.longHeadline;
        fabric.fabricKey = fabricColour.fabricKey;
        fabric.slug = fabricColour.slug;
        fabric.faqTags = fabricColour.faqTags;
        return acc;
    }, {});

    for(const fabricKey in fabrics) {
        await upsertFabric(fabrics[fabricKey])
        await upsertProduct(fabrics[fabricKey])
    }
}

const upsertFabricColour = async (fabricColour: FabricColour) => {
    
    const data = {
        metadata: metadata,
        fields: {
            fabricColourKey: {
                [LOCALE]: fabricColour.fabricColourKey
            },
            title: {
                [LOCALE]: fabricColour.name
            },
            shortDescription    : {
                [LOCALE]: toRichtext(fabricColour.shortDescription)
            },
            longDescription: {
                [LOCALE]: toRichtext(fabricColour.longDescription)
            }
           
        }
    }

    await upsertEntry('fabricColour', fabricColour.fabricColourKey, data);
}

const upsertFabric = async (fabric: Fabric) => {
    const data = {
        metadata: metadata,
        fields: {
            fabricKey: {
                [LOCALE]: fabric.fabricKey
            },
            title: {
                [LOCALE]: fabric.longHeadline
            },
            fabricColours: {
                [LOCALE]: fabric.fabricColourKeys.map((fabricColourKey) => {    
                    return {
                        sys: {
                            type: 'Link',
                            linkType: 'Entry',
                            id: fabricColourKey
                        }
                    }
                })
            }
        }
    }

    await upsertEntry('fabric', fabric.fabricKey, data);
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
            fabric: {
                [LOCALE]: {
                    sys: {
                        type: 'Link',
                        linkType: 'Entry',
                        id: fabric.fabricKey
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
                        id: '6b4P3Qbo6tVD70ifUENWg9'
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

createFabrics()
//helper()