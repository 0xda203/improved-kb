
const { VectaraStore } = require("@langchain/community/vectorstores/vectara");
const { Document } = require("@langchain/core/documents");

// Create the Vectara store.
const store = new VectaraStore({
    customerId: parseInt(process.env.VECTARA_CUSTOMER_ID),
    corpusId: parseInt(process.env.VECTARA_CORPUS_ID),
    apiKey: process.env.VECTARA_API_KEY,
});

async function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

async function uploadToCorpus(content, { url, section, title, type }) {
    const document = new Document({
        pageContent: content,
        title,
        metadata: {
            url,
            section,
            title,
            type
        },
    });

    const ids = await store.addDocuments([document]);
    return ids[0];
}

module.exports = { uploadToCorpus, sleep };