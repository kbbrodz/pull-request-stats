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
  fs_promises.mkdir("build").then(ok => { core.debug("Created 'build' directory");}).catch(err => { core.error("Couldn't create build directory"); });
  fs.writeFile('build/reviewers.md', content, function (err) {
  if (err) core.error(err);
  core.info('Reviwers report written to reviewers.html');
});
