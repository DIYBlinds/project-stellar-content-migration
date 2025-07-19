import { createClient } from 'contentful-management';
import { config } from '../config';

const client = createClient({
    space: config.CONTENTFUL_SPACE_ID!,
    accessToken: config.CONTENTFUL_ACCESS_TOKEN!,
    host: config.CONTENTFUL_HOST!,
    insecure: true,
});

const getEnvironment = client.getSpace(config.CONTENTFUL_SPACE_ID!).then(space => space.getEnvironment(config.CONTENTFUL_ENVIRONMENT!));

// create entry in contentful
export async function upsertEntry(contentTypeId: string, id: string, data: any) {
    try {
        const environment = await getEnvironment;

        if (await tryGetEntry(environment, id)) {
            let entry = await environment.getEntry(id);
            entry.fields = Object.assign({}, entry.fields, data.fields);
            entry.metadata = Object.assign({}, entry.metadata, data.metadata);
            entry = await entry.update();
            await entry.publish();

            console.log('Entry updated:', entry.sys.id);
            return entry;
        }

        const entry = await environment.createEntryWithId(contentTypeId, id, {
            fields: data.fields,
            metadata: data.metadata
        });
        await entry.publish();
        
        console.log('Entry created:', entry.sys.id);

        return entry;
    } catch (error) {
        console.error('Error creating entry:', error);
        throw error;
    }
}

export async function deleteEntry(id: string) {
    const environment = await getEnvironment;

    const entry = await environment.getEntry(id);
    await entry.unpublish();
    await entry.delete();
    console.log('Entry deleted:', id);
}

const tryGetEntry = async (environment: any, id: string) => {
    try {
        const entry = await environment.getEntry(id);
        return entry;
    } catch (error) {
        return false;
    }
}

export const getEntry = async (id: string) => {
    const environment = await getEnvironment;
    const entry = await tryGetEntry(environment, id);
    if (!entry) {
        throw new Error(`Entry not found: ${id}`);
    }
    return entry;
}