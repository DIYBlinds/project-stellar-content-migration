import blogs from '../../.in/blogs.json';
import fs from 'fs';

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
            if (block.type === 'richText') {
                const document = block.content as any;
                if (document.content) {
                    document.content = convertItalicNodes(document.content);
                }
            }
        }
    }

    fs.writeFileSync('./.in/blogs2.json', JSON.stringify(blogs, null, 2));
};

run(); 