const { updatePullRequest } = require('../fetchers');
const core = require('@actions/core');
const fs = require('fs');
const fs_promises = require('fs/promises');

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
}) => 
  fs.mkdir("build", { recursive: true }, (err) => { if (err) throw err;});
  fs.writeFile('build/reviewers.md', content, function (err) {
  if (err) core.error(err);
  core.info('Reviwers report written to reviewers.html');
});
