const { readFile } = require('fs/promises');
const read = require('read-art');
const { convert } = require('html-to-text');
const { improve } = require('./lib/llm');
const { uploadToCorpus } = require('./lib/rag');
const cheerio = require('cheerio');
const axios = require('axios');

async function preProcess(url, maxRetries = 3, retryDelay = 1000) {
    let retries = 0;

    async function fetchURL() {
        try {
            const { data } = await axios.get(url);
            const $ = cheerio.load(data);

            const title = $('.title').text();

            // Check if there is a topic body otherwise return empty string
            if (!$('.topic__body').length) {
                return '';
            }

            $('.topic__body img').each(function () {
                const alt = $(this).attr('src');
                if (alt && (alt.toLowerCase().includes('check') || alt.toLowerCase().includes('error'))) {
                    const replacement = alt.toLowerCase().includes('check') ? 'X' : '';
                    $(this).replaceWith(`<span>${replacement}</span>`);
                } else {
                    $(this).remove();
                }
            });

            // Remove unnecessary elements
            $('.topic__body .feedback').remove();
            $('.topic__body .additional-help').remove();
            $('.topic__body img, .topic__body svg, .topic__body script').remove();
            $('.cards, .cards__inner, .card_item').remove();

            const content = $('.topic__body').html();

            return {
                title,
                body: content
            };

        } catch (error) {
            if (retries < maxRetries) {
                await delay(retryDelay);
                retries++;
                return fetchURL();
            } else {
                return {
                    title: '',
                    body: ''
                };
            }
        }

    }

    return fetchURL();
}

async function crawl({ url, label }) {
    const { body, title } = await preProcess(url);

    if (!body) {
        return { url, label, title: '', content: '' };
    }

    const { content } = await read(body, {
        selectors: {
            source: {
                selector: '.topic__body',
                skipTags: false,
                extract: function (node, options) {
                    return options.domain + ':' + node.text()
                }
            }
        }
    });

    return { url, label, title, content: convert(content, { wordwrap: false }) };
}

const productLabelMap = {
    'jira-work-management': "Jira Work Management",
    'trello': "Trello",
    'confluence-cloud': "Confluence",
    'jira-software-cloud': "Jira Software",
    'jira-service-management-cloud': "Jira Service Management",
    'bitbucket-cloud': "Bitbucket",
}

async function main() {
    // Read json from input/docs.json using es6 import
    const docs = await readFile('input/docs.json', 'utf-8').then(JSON.parse);
    const keys = Object.keys(docs);

    // Convert URLs and labels into a format suitable for the crawler
    const requests = keys.flatMap(key => {
        const label = productLabelMap[key] ?? "Atlassian";
        return docs[key]["urls"].map(url => ({ url, label })); // Ensure there's a return statement here
    });

    // Function to process a batch of requests
    async function processBatch(batch) {
        return Promise.all(batch.map(async (request) => {
            try {
                const { url, label } = request; // Removed title, content from destructuring as they are not in request
                const { title, content } = await crawl(request); // Assume crawl returns an object with title and content
                if (content) {
                    const improvedContent = await improve(title, content);
                    const id = await uploadToCorpus(improvedContent, { url, section: label, title });
                    if (id) {
                        console.log(`Uploaded document with id: ${id} to Vectara.`);
                    }
                }
            } catch (error) {
                console.error(`Error processing request for URL: ${request.url}`, error);
            }
        }));
    }

    // Split requests into batches of 20 and process each batch concurrently
    for (let i = 0; i < requests.length; i += 20) {
        const batch = requests.slice(i, i + 20);
        await processBatch(batch); // Wait for the batch to be processed before moving to the next
    }
}

main().catch(console.error);