const { convert } = require('html-to-text');
const { filterItems } = require('../lib/llm')
const { improve } = require('../lib/llm');
const { uploadToCorpus } = require('../lib/rag');

async function query() {
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
                    "indexName": "confluence.atlassian.com_search",
                    "query": "a",
                    "params": `filters=((product:"Jira Software") OR (product:"Jira Service Management") OR (product:"Confluence") OR (product:"Bitbucket") OR (product:"Questions for Confluence") OR (product:"Atlassian Cloud") OR (product:"Jira Work Management")) AND type:"knowledge_base"&page=0&hitsPerPage=1000`,
                    "analyticsTags": [
                        "prod",
                        "not-testing"
                    ]
                }
            ]
        }),
        "method": "POST"
    }).then(response => response.json());
}

async function main() {
    const results = await query().then(({results}) => results[0].hits);
    const items = results.map(({ title, url, summary, content, product }) => { 
        let body = convert(content, { wordwrap: false });
        // Remove multi break lines and multiple spaces
        body = body.replace(/(\r\n|\n|\r){2,}/g, '\n').replace(/ {2,}/g, ' ');

        return {
            title, 
            url: `https://confluence.atlassian.com${url}`,
            summary, 
            content: body,
            label: product === "Questions for Confluence" ? "Confluence" : product
        }
    });

    const filtered = filterItems(items);
    
    for (const document of filtered) {
        const improvedContent = await improve(document.title, document.content);
        const id = await uploadToCorpus(improvedContent, { url: document.url, section: document.label, title: document.title, type: "knowledge_base" });
        console.log(`Uploaded file ${document.title} to Vectara!`)
    }
    
}

main().catch(console.error);