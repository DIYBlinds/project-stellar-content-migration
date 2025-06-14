import faq from '../../.in/faq.json'
import { htmlToRichText } from 'html-to-richtext-contentful';
import { upsertEntry } from '../utils/contentful';

const LOCALE = 'en-AU';
const metadata = {
    tags: [
        {
            sys: {
                type: 'Link',
                linkType: 'Tag',
                id: "faq"
            }
        }
    ]
}

const createFaq = async () => {
    for(const faqItem of faq.filter((faqItem: any) => faqItem.status === 'live')) {
        await upsertFaq(faqItem)
    }
}

const upsertFaq = async (faqItem: any) => {
    const faqContent = Object.values(faqItem.faqContent)[0] as any
    if (!faqContent) return

    const data = {
        metadata: metadata,
        fields: {
            question: {
                [LOCALE]: faqItem.title
            },
            answer: {
                [LOCALE]: htmlToRichText(faqContent?.fields?.body ?? '')
            }
        }
    }
    try {
        await upsertEntry('faq', `faq-${faqItem.id}`, data)
    } catch (error) {
        console.log(`error --> ${faqItem.id}`)
    }
}

createFaq()