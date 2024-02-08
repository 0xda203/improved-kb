
const { v4: uuidv4 } = require('uuid');
const fetch = require('node-fetch');

const VECTARA = {
    customerId: parseInt(process.env.VECTARA_CUSTOMER_ID),
    corpusId: parseInt(process.env.VECTARA_CORPUS_ID),
    apiKey: process.env.VECTARA_API_KEY,
};

async function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

async function uploadToCorpus(content, { url, section, title, type }) {
    const id = uuidv4();

    const data = JSON.stringify({
        "customerId": VECTARA.customerId,
        "corpusId": VECTARA.corpusId,
        "document": {
            documentId: id,
            title: id,
            "metadataJson": JSON.stringify({
                "url": url,
                "section": section,
                "title": title,
                "type": type
            }), // Empty metadataJson for the document
            "section": [
                {
                    "text": content
                }
            ]
        }
    });

    const response = await
        fetch("https://api.vectara.io/v1/index", {
            "headers": {
                "accept": "application/json",
                "accept-language": "pt-BR,pt;q=0.8",
                "content-type": "application/json",
                "customer-id": VECTARA.customerId.toString(),
                "sec-ch-ua": "\"Not_A Brand\";v=\"8\", \"Chromium\";v=\"120\", \"Brave\";v=\"120\"",
                "sec-ch-ua-mobile": "?0",
                "sec-ch-ua-platform": "\"macOS\"",
                "sec-fetch-dest": "empty",
                "sec-fetch-mode": "cors",
                "sec-fetch-site": "cross-site",
                "sec-gpc": "1",
                "x-api-key": VECTARA.apiKey,
                "Referer": "https://docs.vectara.com/",
                "Referrer-Policy": "strict-origin-when-cross-origin"
            },
            "body": data,
            "method": "POST"
        }).then(response => response.json());

        console.log(response);

    // console.log(`Uploaded document with title: ${title}`);
    return id; // You can return the response data if needed
}

module.exports = { uploadToCorpus, sleep };