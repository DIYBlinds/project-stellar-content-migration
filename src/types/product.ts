
export interface Fabric  {
    fabricKey: string;
    productKey: string;
    slug: string;
    tagLine: string;
    featuredImage: string;
    faqTags: string[];
    longHeadline: string;
    fabricColourKeys: string[];
}

export interface FabricColour  {
    productKey: string;
    name: string;
    fabricKey: string;
    fabricColourKey: string;
    shortDescription: string;
    tagLine: string;
    longHeadline: string;
    longDescription: string;
    careInstructions: string;
}