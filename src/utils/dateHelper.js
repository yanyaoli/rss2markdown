function formatDate(dateString) {
    const options = {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      timeZone: 'Asia/Shanghai'
  };
    return new Date(dateString).toLocaleDateString(undefined, options);
}

function compareDates(dateA, dateB) {
    return new Date(dateB) - new Date(dateA);
}

module.exports = {
    formatDate,
    compareDates
};