function formatDate(dateString) {
    try {
        const date = new Date(dateString);
        return date.toLocaleString('zh-CN', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            timeZone: 'Asia/Shanghai'
        });
    } catch (error) {
        return '日期未知';
    }
}

function compareDates(dateA, dateB) {
    return new Date(dateB) - new Date(dateA);
}

module.exports = {
    formatDate,
    compareDates
};