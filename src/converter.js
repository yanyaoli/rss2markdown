function convertToMarkdown(rssItems) {
    // Sort items by publication date
    rssItems.sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate));

    // Convert each item to Markdown format
    const markdownItems = rssItems.map(item => {
        return `## ${item.title}\n${item.description}\n> 原文链接：${item.link}\n`;
    });

    // Join all markdown items into a single string
    return markdownItems.join('\n');
}

module.exports = {
    convertToMarkdown
};