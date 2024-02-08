const fs = require('fs');
const { readFile, writeFile } = require('fs').promises;
const cheerio = require('cheerio');
const axios = require('axios');
const { uploadToCorpus } = require('../lib/rag');
const { question } = require('../lib/llm');
const { convert } = require('html-to-text');
const read = require('read-art');

async function query(pageNumber) {
    return fetch("https://community.atlassian.com/tnckb94959/plugins/custom/atlassian/atlassian/member_feed_get_markup?authorId=0&feedType=homepageFeed&tid=-6884361458280729284", {
        "headers": {
            "accept": "*/*",
            "accept-language": "pt-BR,pt;q=0.7",
            "content-type": "application/x-www-form-urlencoded; charset=UTF-8",
            "sec-ch-ua": "\"Not_A Brand\";v=\"8\", \"Chromium\";v=\"120\", \"Brave\";v=\"120\"",
            "sec-ch-ua-mobile": "?0",
            "sec-ch-ua-platform": "\"macOS\"",
            "sec-fetch-dest": "empty",
            "sec-fetch-mode": "cors",
            "sec-fetch-site": "same-origin",
            "sec-gpc": "1",
            "x-requested-with": "XMLHttpRequest",
            "cookie": "LithiumCookiesAccepted=0; IR_gbd=atlassian.com; _gcl_au=1.1.1436261401.1705428787; _ga=GA1.2.478565677.1705428787; _mkto_trk=id:594-ATC-127&token:_mch-atlassian.com-1705428787321-61083; _fbp=fb.1.1705428787339.118947890; cb_user_id=null; cb_group_id=null; atl_xid.xc=%7B%22value%22%3A%22387a1414-b44b-4e9e-833a-6cee1be03488%22%2C%22createdAt%22%3A%222024-01-17T17%3A29%3A52.177Z%22%2C%22type%22%3A%22xc%22%7D; optimizelyEndUserId=oeu1705943962604r0.6498142406230316; atlCohort={\"bucketAll\":{\"bucketedAtUTC\":\"2024-01-23T17:46:43.283Z\",\"version\":\"2\",\"index\":28,\"bucketId\":0}}; googtrans=/en/pt; IR_17715=1706213664702%7C0%7C1706213664702%7C%7C; __aid_user_id=63e104e00015d0b19c232f5b; _cs_c=0; _clck=ftajow%7C2%7Cfiw%7C0%7C1476; cb_anonymous_id=%22ec4971cc-2f21-4f87-84a6-920d427c7a51%22; intercom-id-odnoznr4=b382e21e-f0ee-494c-8abb-f93d83c98e98; intercom-session-odnoznr4=; intercom-device-id-odnoznr4=0b1cef96-7033-42a1-ae27-99f8979b256c; _rdt_uuid=1705428787323.b5b04efe-21bf-4f82-9361-4f895819878b; _ga_EKLW76PEWW=GS1.2.1707163426.22.1.1707163482.4.0.0; _cs_id=32ca7669-8ca2-a5d4-9174-a3191bf177c8.1705428787.22.1707164168.1707163427.1.1739592787385.1; ajs_anonymous_id=%22fe3e5f86-9283-4bef-83bd-46c4c624fbc9%22; LiSESSIONID=6F7E94A349F2FC6E3274C205F0BDF861; lithiumLogin:tnckb94959=~2nlLDLwi5M7501lKd~C4wpRAJSmQBsIPGLIFnl788SQ7_aAlKLz0xO1RIrKZVzyHk0FlQ8tje8fHdsq8m7k3VRtl_TcmHjc9s3p9S-VEbaR7wKOV3goXN-xrq-S-Q51gfV45ywpo-GkuNjypw4EjjHkA3HDSRuo9_mqX5fZNVAPk79EoCOlwyJKD_7um5H4UO6XBYYvy_X30jEO2xNdDkf0_x8QrAwTsJmR08XPw..; LithiumUserInfo=5287762; LithiumUserSecure=54ae6f0a-07a2-4b4b-b4a5-c6a92a4bc112; VISITOR_BEACON=~2vQwtaJcN3v7mBgaa~DKYHdyFXcp8jVrZzyeR2jdirnNAEz7j3U4FNpUX9pbJ2Qtl8Ovpom6HVTS0VuPn3OnGsXdglgNhi5XZavlln2A..; AWSALB=JaJi5NEDUSGcR54nhpWgAHi+ODGV88C0icNdzT4fZ4BgM51ZstCH7qy59EM1B1ypRMWpWnzhDOhz6qAcWCUeWUd4fxoOWdn0IMEE/vKB5oPmKCa1wzXoO+rL7HIH; AWSALBCORS=JaJi5NEDUSGcR54nhpWgAHi+ODGV88C0icNdzT4fZ4BgM51ZstCH7qy59EM1B1ypRMWpWnzhDOhz6qAcWCUeWUd4fxoOWdn0IMEE/vKB5oPmKCa1wzXoO+rL7HIH; LithiumVisitor=~2kjl1WpHBF2qp3gOy~S7JEs3hxCUm2RikYlEJ2HK3F9MI42yxQNvXkRwNIrrJsEVDCMlwfpd9HlZwD89mCYgQ_kVz3qwcd3w0TDHszWg..",
            "Referer": "https://community.atlassian.com/",
            "Referrer-Policy": "strict-origin-when-cross-origin"
        },
        "body": "pageNumber=" + pageNumber,
        "method": "POST"
    }).then(response => response.text());
}

async function parselinks(pageNumber) {
    const data = await query(pageNumber);
    const $ = cheerio.load(data);
    const links = [];

    $('.atl-post-list__tile__checkmark').each(function () {
        const parent = $(this).parent();
        const a = parent.find('a');

        const li = $(this).parent().parent().parent(0);
        const title = a.text().trim();
        const date = li.find('span[data-tooltip="Asked"]').parent().text().trim();
        const summary = li.find('p').text().trim();
        const tags = li.find('.adg-tag').map(function () {
            const a = $(this).find('a');
            return a.text().trim(); // Trim whitespace
        }).get();

        links.push({
            title,
            summary,
            tags,
            date,
            url: 'https://community.atlassian.com' + a.attr('href')
        });
    });

    return links;
}

const formatDate = (dateString) => {
    const currentDate = new Date();

    if (/^\d{2}-\d{2}-\d{4}$/.test(dateString)) {
        const [month, day, year] = dateString.split('-');
        return `${day}/${month}/${year}`;
    } else if (dateString.includes('hours ago')) {
        const hoursAgo = parseInt(dateString);
        const pastDate = new Date(currentDate.getTime() - (hoursAgo * 60 * 60 * 1000));
        return `${padZero(pastDate.getDate())}/${padZero(pastDate.getMonth() + 1)}/${pastDate.getFullYear()}`;
    } else if (dateString === 'yesterday') {
        const pastDate = new Date(currentDate.getTime() - (24 * 60 * 60 * 1000));
        return `${padZero(pastDate.getDate())}/${padZero(pastDate.getMonth() + 1)}/${pastDate.getFullYear()}`;
    } else if (['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].includes(dateString)) {
        const dayIndex = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].indexOf(dateString);
        const pastDate = new Date(currentDate.getTime() - ((currentDate.getDay() - dayIndex + 7) % 7) * 24 * 60 * 60 * 1000);
        return `${padZero(pastDate.getDate())}/${padZero(pastDate.getMonth() + 1)}/${pastDate.getFullYear()}`;
    }

    return dateString; // If date format is already in dd/mm/yyyy or any other format, return as it is
};

const padZero = (num) => (num < 10 ? '0' : '') + num;

async function search() {
    const lastPage = 3282;

    const stream = fs.createWriteStream('input/forums.json', { flags: 'a' });
    stream.write('[');

    const batchSize = 10;
    const linksPerBatch = 20;

    for (let i = 1; i <= lastPage; i += batchSize) {
        const batchPromises = [];

        for (let j = i; j < i + batchSize; j++) {
            batchPromises.push(parselinks(j));
        }

        const batches = await Promise.all(batchPromises);

        let totalFetched = 0;

        for (let k = 0; k < linksPerBatch; k++) {
            for (let batchIndex = 0; batchIndex < batchSize; batchIndex++) {
                const links = batches[batchIndex];
                if (links[k]) {
                    totalFetched++;
                    stream.write(JSON.stringify(links[k]) + ',\n');
                }
            }
        }

        console.log(`Fetched ${totalFetched} items from page ${i} out of ${lastPage}`);
    }

    stream.write(']')

    stream.end();
}

function chunkArray(array, chunkSize) {
    const chunkedArray = [];
    for (let i = 0; i < array.length; i += chunkSize) {
        chunkedArray.push(array.slice(i, i + chunkSize));
    }
    return chunkedArray;
}

async function split() {
    const topics = await readFile('input/forums.json', 'utf-8').then(JSON.parse);
    const filtered = topics.filter(({ tags, url, title, summary }) => {
        const chineseJapaneseRegex = /[\u4E00-\u9FAF]|[\u3040-\u30FF]|[\uFF00-\uFFEF]/;
        const versionRegex = /\bv?\d+\.\d+\b/g; // Matches versions in the format vx.x or x.x

        const hasInvalidTags = tags.some(tag => tag.toLowerCase().includes('server') || tag.toLowerCase().includes('data-center'));
        if (hasInvalidTags) return false;

        const hasInvalidURL = url.includes('server') || url.includes('data-center');
        if (hasInvalidURL) return false;

        const hasInvalidTitle = title.toLowerCase().includes('server') || title.toLowerCase().includes('data-center') || title.toLowerCase().includes('app') || chineseJapaneseRegex.test(title) || versionRegex.test(title);
        if (hasInvalidTitle) return false;

        const hasinvalidSummary = summary.toLowerCase().includes('server') || summary.toLowerCase().includes('data-center') || title.toLowerCase().includes('app') || chineseJapaneseRegex.test(summary) || versionRegex.test(summary);
        if (hasinvalidSummary) return false;

        return true;
    })

    // Remove duplicates based on url
    const uniqueUrls = new Set();
    const uniqueFiltered = filtered.filter(({ url }) => {
        if (uniqueUrls.has(url)) {
            return false; // Duplicate URL found
        } else {
            uniqueUrls.add(url);
            return true; // Unique URL
        }
    });

    const formatted = uniqueFiltered.map(({ title, summary, tags, date, url }) => {
        const area = url.split('https://community.atlassian.com/t5/')[1].split('/')[0];

        return {
            title,
            summary,
            product: area,
            date: formatDate(date),
            url
        }
    });

    // Filter items after a certain date (e.g., after 2021)
    const cutoffDate = new Date('2021/01/01'); // January 1, 2021
    const filteredTopics = formatted.filter(topic => {
        // Parse the date string to a Date object
        const dateParts = topic.date.split('/');
        const date = new Date(`${dateParts[1]}/${dateParts[0]}/${dateParts[2]}`);

        // Compare the dates
        return date > cutoffDate;
    });

    const labelMap = {
        'Jira-Software-questions': 'Jira Software',
        'Bitbucket-questions': 'Bitbucket',
        'Jira-Service-Management': 'Jira Service Management',
        'Trello-questions': 'Trello',
        'Jira-Work-Management-Questions': 'Jira Work Management',
        'Automation-questions': 'Atlassian',
        'Atlassian-Access-questions': 'Atlassian',
        'Confluence-Cloud-questions': 'Confluence Cloud',
        'Questions-for-Confluence': 'Confluence'
    }

    const productsToKeep = ['Jira-Software-questions',
        'Bitbucket-questions',
        'Jira-Service-Management',
        'Trello-questions',
        'Jira-Work-Management-Questions',
        'Automation-questions',
        'Atlassian-Access-questions',
        'Confluence-Cloud-questions',
        'Questions-for-Confluence']

    const filteredByProduct = filteredTopics.filter(topic => {
        return productsToKeep.includes(topic.product);
    });

    const results = filteredByProduct.map(item => {
        const { title, url, summary, product, date } = item;

        return {
            title,
            url,
            summary,
            label: labelMap[product],
            date
        }
    });

    const chunks = chunkArray(results, Math.floor(results.length / 4));

    // write chunk into output folder
    for (let i = 0; i < chunks.length; i++) {
        await writeFile(`output/forums_${i}.json`, JSON.stringify(chunks[i], null, 2));
    }

}

// Function to find the parent element with the specified class
function findParentWithClass($element, targetClass) {
    // Check if the current element has the target class
    if ($element.hasClass(targetClass)) {
        return $element;
    }

    // If not, continue to the parent element
    const $parent = $element.parent();

    // If there's no parent or we reached the top of the document, return null
    if (!$parent || !$parent.length) {
        return null;
    }

    // Recursively call the function on the parent element
    return findParentWithClass($parent, targetClass);
}


async function preProcess(url, maxRetries = 3, retryDelay = 1000) {
    let retries = 0;

    async function fetchURL() {
        try {
            const { data } = await axios.get(url);
            const $ = cheerio.load(data);

            const title = $('.atl-page-title > h1').text().trim();
            const question = $('.lia-message-view-qanda-question').find('.lia-message-body-content').html();

            const accepted = $('.atl-qanda-answer-state__acceptance-indicator').map(function(i, e) {
                const parentClass = 'atl-thread-listing__message-wrapper';
                const $parent = findParentWithClass($(this), parentClass);
                return $parent.html();
            });

            const body = `
            ${question}

            ${accepted.get().join('\n')}
            `

            return {
                title,
                body
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

    const { content } = await read(body, {});

    return { url, label, title, content: convert(content, { wordwrap: false }) };
}

async function main() {
    try {
        const docs = await readFile('output/forums_0.json', 'utf-8').then(JSON.parse);
        const batchSize = 20;

        const chunks = [];
        for (let i = 0; i < docs.length; i += batchSize) {
            chunks.push(docs.slice(i, i + batchSize));
        }

        let uploaded = 0;
        console.log(`${chunks.length} chunks to process`)

        for (const chunk of chunks) {

            const promises = chunk.map(async (doc) => {
                const { title, url, label } = doc;
                const { content } = await crawl({ url, label });
                const improved = await question(content);
                const { id } = await uploadToCorpus({ title, content: improved, label });
                return { title, url, label, id };
            });

            await Promise.all(promises);
            uploaded += chunk.length;

            // console.log(`Progress: ${uploaded}/${docs.length} files to Vectara!`)
            await new Promise(resolve => setTimeout(resolve, 2000));
        }
    } catch (ex) {
        console.error(ex);
    }

}

main().catch(console.error);