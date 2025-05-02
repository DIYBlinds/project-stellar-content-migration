import blogs from '../../.in/blogs.json';
import fs from 'fs';

const convertItalicNodes = (content: any[]) => {
    return content.map(node => {
        if (node.nodeType === 'text' && node.content) {
            // Check if any of the content nodes have italic marks
            const hasItalic = node.content.some((textNode: any) => 
                textNode.marks?.some((mark: any) => mark.type === 'italic')
            );

            if (hasItalic) {
                // Convert to new format
                return {
                    nodeType: 'text',
                    data: {},
                    value: node.content.map((textNode: any) => textNode.value).join(''),
                    marks: [{ type: 'italic' }]
                };
            }
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

    fs.writeFileSync('./.in/blogs.json', JSON.stringify(blogs, null, 2));
};

run(); 