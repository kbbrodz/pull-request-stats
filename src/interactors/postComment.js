const { updatePullRequest } = require('../fetchers');
const core = require('@actions/core');
const fs = require('fs');

const buildBody = (currentBody, content) => {
  if (!currentBody.trim()) return content;
  return `${currentBody}\n${content}`;
};


/*
module.exports = ({
  octokit,
  content,
  currentBody,
  pullRequestId,
}) => updatePullRequest({
  octokit,
  id: pullRequestId,
  body: buildBody(currentBody || '', content),
});
*/
module.exports = ({
  octokit,
  content,
  currentBody,
  pullRequestId,
}) => fs.writeFile('reviewers.html', content, function (err) {
  if (err) core.error(err);
  core.info('Reviwers report written to reviewers.html');
});
