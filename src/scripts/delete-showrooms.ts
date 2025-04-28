import showrooms from '../../.in/showrooms.json';
import { deleteEntry } from '../utils/contentful';

const run = async () => {
    for (const showroom of showrooms) {
        await deleteEntry(showroom._id);
        await deleteEntry(`heroimage-showroom-${showroom._id}`);
    }
}

run();
