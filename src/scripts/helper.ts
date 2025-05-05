import blogs from '../../.in/blogs.json';
import fs from 'fs';
import { generateId } from '../utils/id';
import mappingsJson from '../../.in/image-mappings.json';
import tours from '../../.in/hometours.json';
import showrooms from '../../.in/showrooms.json';

const convertItalicNodes = (content: any[]) => {
    return content.map(node => {
        if (node.nodeType === 'italic' && node.content) {
            // Check if any of the content nodes have italic marks

            // Convert to new format
            return {
                nodeType: 'text',
                data: {},
                value: node.content[0].value,
                marks: [{ type: 'italic' }]
            };
        }

        // Recursively process nested content
        if (node.content) {
            node.content = convertItalicNodes(node.content);
        }

        return node;
    });
};

const run = async () => {

    for (const blog of blogs) {
        for (const block of blog.contentBlocks) {
            if (!(block as any).id) {
                (block as any).id = generateId();
            }
        }
    }

    fs.writeFileSync('./.in/blogs.json', JSON.stringify(blogs, null, 2));
};

const fixRixchtextDocument = (block: any) => {
    const document = block.content;
    let content = document.content;
    while (content.length > 0 && !content[0].nodeType && content[0].content) {
        content = content[0].content;
    }
    document.content = content;
}

const fixBlogsRichtextItalics = () => {
    for (const blog of blogs) {
        (blog as any).id = generateId();
        for (const block of blog.contentBlocks) {
            (block as any).id = generateId();
            if (block.type === 'richText') {
                fixRixchtextDocument(block);
                const document = block.content as any;
                if (document.content) {
                    document.content = convertItalicNodes(document.content);
                }
            }
        }
    }

    fs.writeFileSync('./.in/blogs.json', JSON.stringify(blogs, null, 2));
}

const removeRedundantImages = async () => {
    // remove distinct items from mappings baed on title, originalImage and cloudinaryImage field values
    const distinctMappings = (mappingsJson as any[]).filter((mapping: any, index: number, self: any[]) =>
        index === self.findIndex((t: any) => t.title === mapping.title && t.originalImage === mapping.originalImage && t.cloudinaryImage === mapping.cloudinaryImage)
    );

    await Promise.all(distinctMappings.map((mapping: any) => {
        mapping.id = generateId();
    }));

    fs.writeFileSync('./.in/image-mappings.json', JSON.stringify(distinctMappings, null, 2));

}

const mergeImageMappings = async () => {
    const mappings = mappingsJson as any[];
    for (const showroom of showrooms) {
        mappings.push({
            blogTitle: `Showroom: ${showroom._source.title}`,
            originalImage: showroom._source.path,
            cloudinaryImage: showroom._source.cloudinaryImage,
            id: showroom._id
        });
    }

    fs.writeFileSync('./.in/image-mappings.json', JSON.stringify(mappings, null, 2));
    
}   
run(); 