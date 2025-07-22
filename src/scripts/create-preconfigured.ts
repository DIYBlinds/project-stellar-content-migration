import rollerBlinds from '../../.in/roller-blinds.json'
import venetianBlinds from '../../.in/venetian.json'
import verticalBlinds from '../../.in/vertical-blinds.json'
import romanBlinds from '../../.in/roman-blinds.json'
import curtains from '../../.in/curtains.json'
import curvedCurtains from '../../.in/curtains-curved.json'
import boxAndBayCurtains from '../../.in/box-and-bay-curtains.json'
import doubleBlinds from '../../.in/double-blinds.json'
import sfold from '../../.in/sfold-curtains.json'
import doubleCurtains from '../../.in/double-curtains.json'
import linedCurtains from '../../.in/lined-curtains.json'
import panelGlides from '../../.in/panel-glides.json'
import shutters from '../../.in/shutters.json'
import linkedBlinds from '../../.in/linked-blinds.json'
import linkedDoubleBlinds from '../../.in/linked-double-blinds.json'
import { upsertEntry } from '../utils/contentful'
import { Fabric, FabricColour } from '../types/product'
import fs from 'fs';
import { getEntry } from '../utils/contentful';
import preConfiguredRefs from '../../.in/pre-configured-refs.json'

    const data = [...linkedBlinds]

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

const sanapshot = async () => {
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
        fabric.configurator = fabricColour.configurator;
        fabric.finish = fabricColour.finish;
        //fabric.backFabricKey = fabricColour.backFabricKey;
        return acc;
    }, {});

    for(const fabricKey in fabrics) {
        const product = fabrics[fabricKey];
        const ref = preConfiguredRefs.find((ref) => ref.key === product.productKey)?.ref || '';
        const snapshot = await captureSnapshot(product, ref);

        product.snapshot = snapshot;
        
        await upsertProduct(product)
    }
}

const captureSnapshot = async (product: Fabric, ref: string) => {
    const configurator = await getEntry(product.configurator);
    const bundle = configurator?.fields?.bundles?.['en-AU']?.find((bundle: any) => bundle.key === ref);
    const bundleUrl = bundle?.value;

    const bundleName = bundleUrl.split('/').pop()?.split('.')[0] || '';
    const engine = (await import(`../bundles/${bundleName}`)).default;

    if (!engine) {
        throw new Error('Missing configurator bundle');
    }

    let engineResult = engine.init();

    // double blinds
    // engineResult = setConfiguratorField(engine, flattenFields(engineResult.availableFields), 'finish', product.finish);
    // engineResult = setConfiguratorField(engine, flattenFields(engineResult.availableFields), product.finish.includes('sunscreen') ? 'fabric--sunscreen' : 'fabric--light-filtering', product.backFabricKey);
    // engineResult = setConfiguratorField(engine, flattenFields(engineResult.availableFields), 'fabric-color');
    // engineResult = setConfiguratorField(engine, flattenFields(engineResult.availableFields), 'fabric--blockout', product.fabricKey);
    // engineResult = setConfiguratorField(engine, flattenFields(engineResult.availableFields), 'fabric-color--blockout');

    // engineResult = setConfiguratorField(engine, flattenFields(engineResult.availableFields), product.finish.includes('sunscreen') ? 'fabric--sunscreen' : 'fabric--light-filtering', product.backFabricKey);
    // engineResult = setConfiguratorField(engine, flattenFields(engineResult.availableFields), 'fabric-color', product.fabricColourKeys[0]);
    // engineResult = setConfiguratorField(engine, flattenFields(engineResult.availableFields), 'fabric--blockout', product.fabricKey);
    // engineResult = setConfiguratorField(engine, flattenFields(engineResult.availableFields), 'fabric-color--blockout');

    // console.log(product.productKey, product.finish)
    if (!product.finish.includes('finish--timber')) {
        engineResult = setConfiguratorField(engine, flattenFields(engineResult.availableFields), 'finish', product.finish);
    }
    engineResult = setConfiguratorField(engine, flattenFields(engineResult.availableFields), 'fabric', product.fabricKey);
    engineResult = setConfiguratorField(engine, flattenFields(engineResult.availableFields), product.finish.includes('dimout') ? 'fabric-colour' : 'fabric-color');
    // engineResult = setConfiguratorField(engine, flattenFields(engineResult.availableFields), 'fitting-type', 'fitting-type--face');
    // engineResult = setConfiguratorField(engine, flattenFields(engineResult.availableFields), 'curtain-style', 'curtain-style--s-fold');

    const snapshot = engine.publish(engineResult.availableFields);

    return snapshot;
}

const setConfiguratorField = (engine: any, fields: any[], fieldKey: string, optionKey?: string) => {
    if (optionKey === '') {
        return engine;
    }
    const targetField = getField(fields, fieldKey);
    const selectedOption = getFieldOption(fields, fieldKey, optionKey);
    targetField.selectedOption = selectedOption;
    const updateResult = engine.onFieldUpdate(targetField);
    return updateResult;
}

const getField = (fields: any[], fieldKey: string) => {

    return fields.find(
      (field) => areEquals(field?.meta?.toString(), fieldKey) || areEquals(field?.name?.toString(), fieldKey),
    );
  }

  const getFieldOption = (fields: any[], fieldKey: string, optionKey?: string) => {
    const field = getField(fields, fieldKey);
    if (!optionKey) {
        return (field as any).options?.[0];
    }

    if (field && (field as any).options) {
      return (field as any).options.find(
        (option: any) =>
          areEquals(option.meta?.toString(), optionKey) || areEquals(option.name?.toString(), optionKey),
      );
    }
    return null;
  }

  const areEquals = (a?: string, b?: string) => {
    if (!a || !b) return false;
    return a.toLowerCase() === b.toLowerCase();
  }

  const flattenFields = (fields: any[]) => {
    if (!fields || fields.length === 0) {
      return [];
    }

    const groupFieldTypes = ["GROUP", "SET"];
    // FieldType.MEASUREMENT is removed
    const singleFields = fields.filter((field) => !groupFieldTypes.includes(field.type));
    const grouppedFields = fields
      .filter((field) => groupFieldTypes.includes(field.type))
      .flatMap((field: any) => field.fields);

    return [...singleFields, ...grouppedFields];
  }

const helper = async () => {
    for(const fabricColour of data) {
        (fabricColour as any).slug = `/diyblinds/blinds/${fabricColour.productKey}`;
        (fabricColour as any).faqTags = ['Blinds', 'Blinds|Linked', 'Blinds|Double'];


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
    fs.writeFileSync('.in/linked-double-blinds.json', JSON.stringify(data, null, 2));
}

const run = async () => {
    for(const fabricColour of data) {
        await upsertFabricColour(fabricColour)
    }

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
        fabric.configurator = fabricColour.configurator;
        fabric.finish = fabricColour.finish;
        return acc;
    }, {});

    for(const fabricKey in fabrics) {
        await upsertFabric(fabrics[fabricKey])
        await upsertProduct(fabrics[fabricKey])
    }
}

const shortenId = (id: string) => {
    return id
    .replace('blockout-and-sunscreen-double-blinds', 'bo-sc-db')
    .replace('blockout-and-light-filtering-double-blinds', 'bo-lf-db')
    .replace('sheer-and-blockout-curtains', 'sh-bo-dc')
    .replace('linked-light-filtering-roller-blinds', 'linked-lf-blinds')
    .replace('linked-blockout-roller-blinds', 'linked-bo-blinds')
    .replace('linked-light-filtering-roller-blinds', 'linked-lf-blinds')
    .replace('linked-blockout-and-sunscreen-double-blinds', 'linked-bo-sc-db')
    .replace('linked-blockout-and-light-filtering-double-blinds', 'linked-bo-lf-db')

}

const upsertFabricColour = async (fabricColour: FabricColour) => {
    const colour = fabricColour.fabricColourKey.split('--').pop()
    const id = shortenId(`fc--${fabricColour.productKey}--${colour}`)
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
    const id = shortenId(`f--${fabric.productKey}`)
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
                            id: `fc--${shortenId(fabric.productKey)}--${colour}`
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
                        id: `f--${shortenId(fabric.productKey)}`
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
                        id: fabric.configurator
                    }
                }
            },
            configuration: {
                [LOCALE]: fabric.snapshot
            }
        }
        
    }

    await upsertEntry('preConfiguredProduct', shortenId(fabric.productKey), data);
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

//helper()
//run()
sanapshot()