import fs from 'fs';
import path from 'path';
import { uploadImage } from './upload';
import { sanitizePublicId } from './upload';

const rooms = ['living-room--panel-glides']
const run = async () => {
    const files = [];
    const refs = []
    // loop through all images in /.in/images and it's subfolder
    const images = fs.readdirSync('./.in/images/', { recursive: true, encoding: null });
    for (const image of images) {
        // check if image is a valid image file
        const isImage = image.endsWith('.png') || image.endsWith('.jpg') || image.endsWith('.jpeg') || image.endsWith('.webp')
        if (!isImage) {
            continue;
        }
        const imageName = image.split('\\').pop() ?? image;
        const fabricColorKeyParts = imageName.split('.')[0].split('--');
        const colorName = fabricColorKeyParts.pop();
        const fabricKey = fabricColorKeyParts.join('--');
        const fabricName = fabricColorKeyParts.pop();
        const imagePath = path.join('./.in/images/', image);
        // get image parent folder
        const dir = path.dirname(imagePath).split('\\')
        const product = dir.pop()
        const room = dir.pop() ?? ''
        
        const imageNameParts = imageName.split('--');
        imageNameParts.shift();
        const newImageName = product?.replace('ref-', '') + '--' + imageNameParts.join('--');
        const newImagePath = path.join(`./.in/images/${room}/${product}`, newImageName)
        
        const publicId = sanitizePublicId(newImageName);
        refs.push({
            url: `https://res.cloudinary.com/dj7xmqwpi/image/upload/fl_layer_apply,l_${publicId}/${room}`,
            product,
            productVariantKey: `${product}-${fabricName}`,
            fabricKey,
            fabricVariantKey: `${imageName.split('.')[0]}`
        });

        if (rooms.includes(room) || true) {
            // rename file
            fs.renameSync(imagePath, newImagePath);
            files.push({
                path: newImagePath,
                //image parent folder
                product,
                room
            })
        }
    }
    fs.writeFileSync('./.in/refs.json', JSON.stringify(refs, null, 2))

    // for(const file of files) {
    //     const { path, product, room } = file
    //     const publicId = path.split('\\').pop() ?? ''
    //     if (product && room && path) {
    //        await uploadImage(`06. Website/07. Renders/${room}/${product}`, path, publicId)
    //     }
    // }


};

run().catch(console.error);