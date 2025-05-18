import fs from 'fs';
import path from 'path';
import { uploadImage } from './upload';
import { sanitizePublicId } from './upload';

const run = async () => {
    const files = [];
    // loop through all images in /.in/images and it's subfolder
    const images = fs.readdirSync('./.in/images/', { recursive: true, encoding: null });
    for (const image of images) {
        // check if image is a valid image file
        const isImage = image.endsWith('.png') || image.endsWith('.jpg') || image.endsWith('.jpeg') || image.endsWith('.webp')
        if (!isImage) {
            continue;
        }

        const imagePath = path.join('./.in/images/', image);
        // remove 'fabric-' prefix from filename
        const imageName = image.replace('fabric-', '');
        //console.log(imageName)
        const newImagePath = path.join('./.in/images/', imageName)
        // rename file
        fs.renameSync(imagePath, newImagePath);

        // get image parent folder
        const dir = path.dirname(newImagePath).split('\\')
        const product = dir.pop()
        const room = dir.pop()

        files.push({
            path: newImagePath,
            //image parent folder
            product,
            room
        })
    }

    for(const file of files) {
        const { path, product, room } = file
        const publicId = path.split('\\').pop() ?? ''
        if (product && room && path) {
           await uploadImage(`DIYblinds/Renderings/${room}/${product}`, path, publicId)
        }
    }

    const refs = []
    for(const file of files) {
        const { path, product, room } = file
        const publicId = sanitizePublicId(path.split('\\').pop() ?? '')
        let  fabricParts = publicId.split('--')
        const color = fabricParts.pop();
        const fabricKey = `fabric-${fabricParts.join('--')}`
        const fabricName = fabricParts.pop()

        if (product && room && path) {
            refs.push({
                url: `https://res.cloudinary.com/dj7xmqwpi/image/upload/fl_layer_apply,l_${publicId}/${room}`,
                product,
                productVariantKey: `${product}-${fabricName}`,
                fabricKey: fabricKey,
                fabricVariantKey: `${fabricKey}--${color}`
            })
        }
    }

    // write refs to file
    fs.writeFileSync('./.in/refs.json', JSON.stringify(refs, null, 2))

};

run().catch(console.error);