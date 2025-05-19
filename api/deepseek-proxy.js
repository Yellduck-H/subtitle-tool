// const fetch = require('node-fetch'); // Or import fetch from 'node-fetch'; if using ES modules top-level

export default async function handler(req, res) {
    const fetch = (await import('node-fetch')).default;
    const deepSeekApiKey = process.env.DEEPSEEK_API_KEY; // <--- 将此行移到前面

    console.log('--- deepseek-proxy function invoked ---');
    console.log('Request method:', req.method);
    console.log('Request body (first 100 chars if exists):', JSON.stringify(req.body)?.substring(0, 100));
    console.log(`DEEPSEEK_API_KEY is set: ${!!deepSeekApiKey}`);

    // 只允许POST请求
    if (req.method !== 'POST') {
        res.setHeader('Allow', ['POST']);
        return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
    }

    if (!deepSeekApiKey) {
        console.error('DEEPSEEK_API_KEY is not set in environment variables.');
        return res.status(500).json({ error: 'API Key not configured on server.' });
    }

    const deepSeekApiUrl = 'https://api.deepseek.com/chat/completions';

    try {
        // 从前端请求中获取body
        const requestPayload = req.body;

        console.log('Calling DeepSeek API at:', new Date().toISOString());
        const apiResponse = await fetch(deepSeekApiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${deepSeekApiKey}`,
            },
            body: JSON.stringify(requestPayload),
        });

        // 检查来自DeepSeek API的响应是否OK
        if (!apiResponse.ok) {
            // Forward the error from DeepSeek API
            const errorData = await apiResponse.json();
            console.error('Error from DeepSeek API:', errorData);
            return res.status(apiResponse.status).json(errorData);
        }
        
        // 处理流式响应
        if (requestPayload.stream && apiResponse.body) {
            res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
            res.setHeader('Cache-Control', 'no-cache');
            res.setHeader('Connection', 'keep-alive');
            apiResponse.body.pipe(res);
            return;
        } else {
            // 处理非流式响应
            const data = await apiResponse.json();
            res.status(200).json(data);
        }

    } catch (error) {
        console.error('Error in proxy function:', error);
        res.status(500).json({ error: 'An internal server error occurred.' });
    }
} 