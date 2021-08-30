const { TABLE_TITLE } = require('../constants');

const getMessage = (periodLength) => {
  if (periodLength === 1) return 'Stats for the last day:';
  return `Stats for the last ${periodLength} days:`;
};

module.exports = ({ table, periodLength }) => {
  const message = getMessage(periodLength);
  // Add extra newline to fix formatting in GH Pages https://github.com/pages-themes/cayman/issues/82
  return `${TABLE_TITLE}\n\n${message}\n${table}`;
};
