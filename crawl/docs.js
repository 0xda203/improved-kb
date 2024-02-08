const { convert } = require('html-to-text');
const { improve } = require('../lib/llm');
const { uploadToCorpus } = require('../lib/rag');
const { readFile, writeFile } = require('fs').promises;
const fetch = require('node-fetch');

async function query(q) {
    return fetch("https://cu5kfwe75c-3.algolianet.com/1/indexes/*/queries?x-algolia-agent=Algolia%20for%20JavaScript%20(4.13.0)%3B%20Browser", {
        "headers": {
            "accept": "*/*",
            "accept-language": "pt-BR,pt;q=0.7",
            "content-type": "application/x-www-form-urlencoded",
            "sec-ch-ua": "\"Not_A Brand\";v=\"8\", \"Chromium\";v=\"120\", \"Brave\";v=\"120\"",
            "sec-ch-ua-mobile": "?0",
            "sec-ch-ua-platform": "\"macOS\"",
            "sec-fetch-dest": "empty",
            "sec-fetch-mode": "cors",
            "sec-fetch-site": "cross-site",
            "sec-gpc": "1",
            "x-algolia-api-key": "8cb0497a0549da256319b1b8178e5421",
            "x-algolia-application-id": "CU5KFWE75C",
            "Referer": "https://confluence.atlassian.com/",
            "Referrer-Policy": "strict-origin-when-cross-origin"
        },
        "body": JSON.stringify({
            "requests": [
                {
                    "indexName": "support.atlassian.com_search",
                    "params": `filters=url:"${q}"`,
                }
            ]
        }),
        "method": "POST"
    }).then(response => response.json());
}

async function fetch() {
    const docs = await readFile('input/docs.json', 'utf-8').then(JSON.parse);
    const keys = Object.keys(docs);

    // Convert URLs and labels into a format suitable for the crawler
    const requests = keys.flatMap(key => {
        return docs[key]["urls"].map(url => url); // Ensure there's a return statement here
    });

    const batchSize = 50;

    const chunks = [];
    for (let i = 0; i < requests.length; i += batchSize) {
        chunks.push(requests.slice(i, i + batchSize));
    }

    const filteredResults = [];

    for (const chunk of chunks) {
        const promises = chunk.map(async (request) => {
            const results = await query(request + "/").then(({ results }) => results[0]);
            return results;
        });

        const resolved = await Promise.all(promises);
        const filtered = resolved.filter(item => item.hits.length > 0);
        filteredResults.push(...filtered);

        await new Promise(resolve => setTimeout(resolve, 1000));
    }

    const results = filteredResults.map(item => {
        const { title, url, summary, content, product } = item.hits[0];

        let body = convert(content, { wordwrap: false });

        return {
            title,
            url: url,
            summary,
            content: body,
            label: product === "Questions for Confluence" ? "Confluence" : product
        }
    });

    // Write to a file
    await writeFile('input/docs.json', JSON.stringify(results, null, 2));
}

async function main() {
    try {
        const docs = await readFile('input/docs.json', 'utf-8').then(JSON.parse);
        const batchSize = 20;

        const chunks = [];
        for (let i = 0; i < docs.length; i += batchSize) {
            chunks.push(docs.slice(i, i + batchSize));
        }

        let uploaded = 0;

        console.log(`${chunks.length} chunks to process`)

        for (const chunk of chunks) {

            const promises = chunk.map(async (doc) => {
                const { title, content, url, label } = doc;
                const fixedLabel = label ?? "Atlassian";
                const improvedContent = await improve(content);
                const id = await uploadToCorpus(improvedContent, { url, section: fixedLabel, title, type: "documentation" });
            });

            await Promise.all(promises);
            uploaded += chunk.length;

            console.log(`Progress: ${uploaded}/${docs.length} files to Vectara!`)
            await new Promise(resolve => setTimeout(resolve, 2000));
        }
    } catch (error) {
        console.error(error);
    }
}

main().catch(console.error);