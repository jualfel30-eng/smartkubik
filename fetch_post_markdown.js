
const fs = require('fs');
const https = require('https');

const PROJECT_ID = 'ji21yoem';
const DATASET = 'production';
const QUERY = encodeURIComponent('*[_type == "post"] | order(publishedAt desc)[0]');
const URL = `https://${PROJECT_ID}.api.sanity.io/v2021-10-21/data/query/${DATASET}?query=${QUERY}`;

https.get(URL, (res) => {
    let data = '';
    res.on('data', (chunk) => data += chunk);
    res.on('end', () => {
        try {
            const json = JSON.parse(data);
            if (!json.result) {
                console.error('No result found');
                return;
            }
            const post = json.result;

            let markdown = `# ${post.title}\n\n`;
            if (post.publishedAt) {
                markdown += `*Published: ${new Date(post.publishedAt).toLocaleDateString()}*\n\n`;
            }

            if (post.body) {
                post.body.forEach(block => {
                    if (block._type === 'block') {
                        if (block.style === 'h2') markdown += `## `;
                        if (block.style === 'h3') markdown += `### `;
                        if (block.style === 'h4') markdown += `#### `;

                        if (block.listItem === 'bullet') markdown += `- `;

                        if (block.children) {
                            block.children.forEach(span => {
                                let text = span.text;
                                if (span.marks && span.marks.includes('strong')) text = `**${text}**`;
                                if (span.marks && span.marks.includes('em')) text = `*${text}*`;
                                markdown += text;
                            });
                        }
                        markdown += '\n\n';
                    }
                });
            }

            fs.writeFileSync('latest_post.md', markdown);
            console.log('Markdown saved to latest_post.md');

        } catch (e) {
            console.error('Error parsing JSON:', e);
        }
    });
}).on('error', (err) => {
    console.error('Error fetching data:', err);
});
