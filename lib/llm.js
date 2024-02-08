const fetch = require('node-fetch');

const PROMPT = `Could you please provide a technical summary of the given text, including all key points and details? The summary should be comprehensive and accurately reflect the main message and arguments presented in the original text. To ensure accuracy, please read the text carefully and pay attention to any nuances, details or complexities in the language. Additionally, the summary should avoid any personal biases or interpretations and remain objective and factual throughout.`


const PROMPT_QA = `Could you please analyze the forum topic provided, starting with the initial question posted by a user at the top, followed by the various responses and solutions offered by other forum members ? Your task is to accurately identify and summarize the core question asked by the initial user, and then sift through the responses to find the most correct and definitive answer provided in the forum.The summary should include a clear and concise description of the problem posed by the user, as well as a detailed explanation of the solution deemed most accurate and helpful by the forum or by the criteria of effectiveness and correctness.It is important to remain objective and factual, carefully evaluating the responses to ensure the summary reflects the best available advice or solution offered in the discussion. Do not mention users' names or any personal information, only the question and the answer.`

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function improve(content) {
    try {
        const response = await fetch(process.env.DEEPINFRA_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${process.env.DEEPINFRA_API_KEY}`,
            },
            body: JSON.stringify({
                "model": process.env.DEEPINFRA_MODEL_NAME,
                "messages": [
                    {
                        "role": "system",
                        "content": PROMPT
                    },
                    {
                        "role": "user",
                        "content": content
                    }
                ],
                "max_tokens": null,
                "temperature": 0.4,
                "top_p": 0.9,
                "top_k": 40,
                "presence_penalty": 0,
                "repetition_penalty": 1.2,
                "frequency_penalty": 0,
            }),
        }).then(res => {
            return res.json();
        });

        return response.choices[0].message.content;
    } catch (ex) {
        // If got Socket hang up error, retry with some delay
        if (ex.code === 'ECONNRESET' || ex.code === 'ECONNABORTED' || ex.code === 'ECONNREFUSED' || ex.code === 'EAI_AGAIN' || ex.code === 'ENOTFOUND' || ex.code === 'ETIMEDOUT' || ex.code === 'UND_ERR_SOCKET' || ex.code === 'UND_ERR_SOCKET_TIMEOUT' || ex.code === 'UND_ERR_SOCKET_CLOSED' || ex.code === 'UND_ERR_SOCKET_CONNECT' || ex.code === 'UND_ERR_SOCKET_WRITE' || ex.code === 'UND_ERR_SOCKET_READ' || ex.code === 'UND_ERR_SOCKET_BIND') {
            await delay(1000);
            return improve(content);
        }
    }
    
}

async function question(content) {
    try {
        const response = await fetch(process.env.DEEPINFRA_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${process.env.DEEPINFRA_API_KEY}`,
            },
            body: JSON.stringify({
                "model": process.env.DEEPINFRA_MODEL_NAME,
                "messages": [
                    {
                        "role": "system",
                        "content": PROMPT_QA
                    },
                    {
                        "role": "user",
                        "content": content
                    }
                ],
                "max_tokens": null,
                "temperature": 0.4,
                "top_p": 0.9,
                "top_k": 40,
                "presence_penalty": 0,
                "repetition_penalty": 1.2,
                "frequency_penalty": 0,
            }),
        }).then(res => {
            return res.json();
        });

        return response.choices[0].message.content;
    } catch (ex) {
        // If got Socket hang up error, retry with some delay
        if (ex.code === 'ECONNRESET' || ex.code === 'ECONNABORTED' || ex.code === 'ECONNREFUSED' || ex.code === 'EAI_AGAIN' || ex.code === 'ENOTFOUND' || ex.code === 'ETIMEDOUT' || ex.code === 'UND_ERR_SOCKET' || ex.code === 'UND_ERR_SOCKET_TIMEOUT' || ex.code === 'UND_ERR_SOCKET_CLOSED' || ex.code === 'UND_ERR_SOCKET_CONNECT' || ex.code === 'UND_ERR_SOCKET_WRITE' || ex.code === 'UND_ERR_SOCKET_READ' || ex.code === 'UND_ERR_SOCKET_BIND') {
            await delay(1000);
            return improve(content);
        }
    }
}

module.exports = { improve, question };