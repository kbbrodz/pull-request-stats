/******/ (() => { // webpackBootstrap
/******/ 	var __webpack_modules__ = ({

/***/ 4438:
/***/ ((module) => {

const TABLE_TITLE = '## Pull reviewers stats';

module.exports = {
  TABLE_TITLE,
};


/***/ }),

/***/ 9021:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

const core = __nccwpck_require__(7396);
const github = __nccwpck_require__(716);
const { subtractDaysToDate } = __nccwpck_require__(2070);
const {
  alreadyPublished,
  getPulls,
  getPullRequest,
  getReviewers,
  buildTable,
  buildComment,
  postComment,
  trackError,
  trackRun,
  trackSuccess,
} = __nccwpck_require__(7896);

const run = async (params) => {
  const {
    org,
    repos,
    sortBy,
    githubToken,
    periodLength,
    displayCharts,
    disableLinks,
    pullRequestId,
    limit,
  } = params;
  core.debug(`Params: ${JSON.stringify(params, null, 2)}`);

  const octokit = github.getOctokit(githubToken);

  const pullRequest = await getPullRequest({ octokit, pullRequestId });
  if (alreadyPublished(pullRequest)) {
    core.info('Skipping execution because stats are published already');
    return false;
  }

  const startDate = subtractDaysToDate(new Date(), periodLength);
  const pulls = await getPulls({
    octokit, org, repos, startDate,
  });
  core.info(`Found ${pulls.length} pull requests to analyze`);

  const reviewers = getReviewers(pulls);
  core.info(`Analyzed stats for ${reviewers.length} pull request reviewers`);

  const table = buildTable(reviewers, {
    limit,
    sortBy,
    disableLinks,
    periodLength,
    displayCharts,
  });
  core.debug('Stats table built successfully');

  const content = buildComment({ table, periodLength });
  core.debug(`Commit content built successfully: ${content}`);

  await postComment({
    octokit,
    content,
    pullRequestId,
    currentBody: pullRequest.body,
  });
  core.debug('Posted comment successfully');

  return true;
};

module.exports = async (params) => {
  try {
    trackRun(params);
    const start = new Date();
    const executed = await run(params);
    const end = new Date();
    trackSuccess({ executed, timeMs: end - start });
  } catch (error) {
    trackError(error);
    throw error;
  }
};


/***/ }),

/***/ 2543:
/***/ ((module) => {

const PR_BY_ID_QUERY = `
query($id: ID!) {
  node(id: $id) {
    ... on PullRequest {
      id
      body
    }
  }
}
`;

module.exports = (octokit, id) => {
  const variables = { id };
  return octokit
    .graphql(PR_BY_ID_QUERY, variables)
    .catch((error) => {
      const msg = `Error fetching pull requests with id "${id}"`;
      throw new Error(`${msg}. Error: ${error}`);
    });
};


/***/ }),

/***/ 7462:
/***/ ((module) => {

const PRS_QUERY = `
query($search: String!, $limit: Int!, $after: String) {
  search(query: $search, first: $limit, after: $after, type: ISSUE) {
    edges {
      cursor
      node {
        ... on PullRequest {
          id
          publishedAt
          author { ...ActorFragment }
          reviews(first: 100) {
            nodes {
              id
              submittedAt
              commit { pushedDate }
              comments { totalCount }
              author { ...ActorFragment }
            }
          }
        }
      }
    }
  }
}

fragment ActorFragment on User {
  url
  login
  avatarUrl
  databaseId
}
`;

module.exports = ({
  octokit,
  search,
  after,
  limit = null,
}) => {
  const variables = { search, after, limit };
  return octokit
    .graphql(PRS_QUERY, variables)
    .catch((error) => {
      const msg = `Error fetching pull requests with variables "${JSON.stringify(variables)}"`;
      throw new Error(`${msg}. Error: ${error}`);
    });
};


/***/ }),

/***/ 5195:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

const fetchPullRequestById = __nccwpck_require__(2543);
const fetchPullRequests = __nccwpck_require__(7462);
const updatePullRequest = __nccwpck_require__(6435);

module.exports = {
  fetchPullRequestById,
  fetchPullRequests,
  updatePullRequest,
};


/***/ }),

/***/ 6435:
/***/ ((module) => {

const UPDATE_PR_MUTATION = `
mutation($id: ID!, $body: String!) {
  updatePullRequest(input: {
    body: $body,
    pullRequestId: $id
  }) {
    pullRequest {
      id
    }
  }
}
`;

module.exports = ({
  octokit,
  id,
  body,
  event,
}) => {
  const variables = { id, body, event };
  return octokit
    .graphql(UPDATE_PR_MUTATION, variables)
    .catch((error) => {
      const msg = `Error updating pull request with id "${id}"`;
      throw new Error(`${msg}. Error: ${error}`);
    });
};


/***/ }),

/***/ 7397:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

const { TABLE_TITLE } = __nccwpck_require__(4438);

module.exports = (pullRequest) => {
  const { body } = pullRequest || {};

  const regexp = new RegExp(`(^|\\n)(${TABLE_TITLE})\\n`);
  return regexp.test(body);
};


/***/ }),

/***/ 1869:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

const { TABLE_TITLE } = __nccwpck_require__(4438);

const getMessage = (periodLength) => {
  if (periodLength === 1) return 'Stats for the last day:';
  return `Stats for the last ${periodLength} days:`;
};

module.exports = ({ table, periodLength }) => {
  const message = getMessage(periodLength);
  return `${TABLE_TITLE}\n${message}\n${table}`;
};


/***/ }),

/***/ 9042:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

const JSURL = __nccwpck_require__(1409);

const URL = 'https://app.flowwer.dev/charts/review-time/';

const toSeconds = (ms) => Math.round(ms / 1000);

const compressInt = (int) => int.toString(36);

const compressDate = (date) => compressInt(Math.round(date.getTime() / 1000));

const parseReview = ({ submittedAt, timeToReview }) => ({
  d: compressDate(new Date(submittedAt)),
  t: compressInt(toSeconds(timeToReview)),
});

module.exports = (reviewer, period) => {
  const { author, reviews } = reviewer || {};
  const data = JSURL.stringify({
    u: {
      i: `${author.id}`,
      n: author.login,
    },
    p: period,
    r: (reviews || []).map(parseReview),
  });

  return `${URL}${data}`;
};


/***/ }),

/***/ 9619:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

const { STATS, STATS_OPTIMIZATION } = __nccwpck_require__(8974);

const getBest = (values, optimization) => (optimization === 'MAX' ? Math.max(...values) : Math.min(...values));

const calculateBests = (allStats) => STATS.reduce((prev, statName) => {
  const values = allStats.map((v) => v[statName]);
  const best = getBest(values, STATS_OPTIMIZATION[statName]);
  return { ...prev, [statName]: best };
}, {});

module.exports = calculateBests;


/***/ }),

/***/ 3006:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

const { STATS } = __nccwpck_require__(8974);

const sumStat = (stats, statName) => stats.reduce((a, values) => a + (values[statName] || 0), 0);

const calculateTotals = (allStats) => STATS.reduce((prev, statName) => ({
  ...prev,
  [statName]: sumStat(allStats, statName),
}), {});

module.exports = calculateTotals;


/***/ }),

/***/ 8974:
/***/ ((module) => {

const SORT_KEY = {
  TIME: 'timeToReview',
  REVIEWS: 'totalReviews',
  COMMENTS: 'totalComments',
};

const TITLES = {
  avatar: '',
  username: 'User',
  timeToReview: 'Median time to review',
  totalReviews: 'Total reviews',
  totalComments: 'Total comments',
};

const COLUMNS_ORDER = ['totalReviews', 'timeToReview', 'totalComments'];

const STATS_OPTIMIZATION = {
  totalReviews: 'MAX',
  totalComments: 'MAX',
  commentsPerReview: 'MAX',
  timeToReview: 'MIN',
};

const STATS = Object.keys(STATS_OPTIMIZATION);

module.exports = {
  SORT_KEY,
  TITLES,
  COLUMNS_ORDER,
  STATS,
  STATS_OPTIMIZATION,
};


/***/ }),

/***/ 2305:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

const { STATS } = __nccwpck_require__(8974);

const calculatePercentage = (value, total) => {
  if (!total) return 0;
  return Math.min(1, Math.max(0, value / total));
};

const getContributions = (reviewer, totals) => STATS.reduce((prev, statsName) => {
  const percentage = calculatePercentage(reviewer.stats[statsName], totals[statsName]);
  return { ...prev, [statsName]: percentage };
}, {});

module.exports = getContributions;


/***/ }),

/***/ 4242:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

const { TITLES } = __nccwpck_require__(8974);
const { durationToString, isNil } = __nccwpck_require__(2070);

const NA = '-';

const MEDAL_ICONS = [0x1F947, 0x1F948, 0x1F949]; /* 🥇🥈🥉 */

const CHART_CHARACTER = '▀';

const CHART_MAX_LENGTH = 10;

const AVATAR_SIZE = {
  SMALL: 20,
  LARGE: 32,
};

const noParse = (value) => value;

const generateChart = (percentage = 0) => {
  const length = Math.round(percentage * CHART_MAX_LENGTH);
  return Array(length).fill(CHART_CHARACTER).join('');
};

const getChartsData = ({ index, contributions, displayCharts }) => {
  const addBr = (data) => (displayCharts ? `<br/>${data}` : '');
  const medal = MEDAL_ICONS[index];

  return {
    username: addBr(medal ? String.fromCodePoint(medal) : ''),
    timeStr: addBr(generateChart(contributions.timeToReview)),
    reviewsStr: addBr(generateChart(contributions.totalReviews)),
    commentsStr: addBr(generateChart(contributions.totalComments)),
  };
};

const bold = (value) => `**${value}**`;

const buildLink = (href, content) => `<a href="${href}">${content}</a>`;

const buildImage = (src, width) => `<img src="${src}" width="${width}">`;

const getImage = ({ author, displayCharts }) => {
  const { avatarUrl, url } = author;
  const avatarSize = displayCharts ? AVATAR_SIZE.LARGE : AVATAR_SIZE.SMALL;

  return buildLink(url, buildImage(avatarUrl, avatarSize));
};

const addReviewsTimeLink = (text, disable, link) => {
  const addLink = link && !disable;
  return addLink ? `[${text}](${link})` : text;
};

const applyLimit = (data, limit) => (limit > 0 ? data.slice(0, limit) : data);

module.exports = ({
  reviewers,
  bests = {},
  disableLinks = false,
  displayCharts = false,
  limit = null,
}) => {
  const printStat = (stats, statName, parser) => {
    const value = stats[statName];
    if (isNil(value)) return NA;

    const isBest = value === bests[statName];
    const parsed = parser(value);
    return isBest ? bold(parsed) : parsed;
  };

  const buildRow = ({ reviewer, index }) => {
    const {
      author, stats, contributions, urls,
    } = reviewer;
    const { login } = author || {};
    const chartsData = getChartsData({ index, contributions, displayCharts });

    const avatar = getImage({ author, displayCharts });
    const timeVal = printStat(stats, 'timeToReview', durationToString);
    const timeStr = addReviewsTimeLink(timeVal, disableLinks, urls.timeToReview);
    const reviewsStr = printStat(stats, 'totalReviews', noParse);
    const commentsStr = printStat(stats, 'totalComments', noParse);

    return {
      avatar,
      username: `${login}${chartsData.username}`,
      timeToReview: `${timeStr}${chartsData.timeStr}`,
      totalReviews: `${reviewsStr}${chartsData.reviewsStr}`,
      totalComments: `${commentsStr}${chartsData.commentsStr}`,
    };
  };

  const execute = () => {
    const data = reviewers.map((reviewer, index) => buildRow({
      reviewer,
      index,
      bests,
      displayCharts,
    }));

    return [
      TITLES,
      ...applyLimit(data, limit),
    ];
  };

  return execute();
};


/***/ }),

/***/ 3463:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

const table = __nccwpck_require__(7677);
const buildReviewTimeLink = __nccwpck_require__(9042);
const getContributions = __nccwpck_require__(2305);
const calculateTotals = __nccwpck_require__(3006);
const calculateBests = __nccwpck_require__(9619);
const getTableData = __nccwpck_require__(4242);
const toTableArray = __nccwpck_require__(7301);
const sortByStats = __nccwpck_require__(637);

module.exports = (reviewers, options = {}) => {
  const {
    sortBy,
    periodLength,
    disableLinks,
    displayCharts,
    limit,
  } = options;

  const execute = () => {
    const allStats = reviewers.map((r) => r.stats);
    const totals = calculateTotals(allStats);
    const bests = calculateBests(allStats);

    const populatedReviewers = sortByStats(reviewers, sortBy).map((reviewer) => ({
      ...reviewer,
      contributions: getContributions(reviewer, totals),
      urls: { timeToReview: buildReviewTimeLink(reviewer, periodLength) },
    }));

    const tableData = getTableData({
      bests,
      disableLinks,
      displayCharts,
      limit,
      reviewers: populatedReviewers,
    });

    return table(toTableArray(tableData));
  };

  return execute();
};


/***/ }),

/***/ 637:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

const { SORT_KEY, STATS_OPTIMIZATION } = __nccwpck_require__(8974);

const buildSort = (statName) => (a, b) => {
  const { stats: statsA = {} } = a;
  const { stats: statsB = {} } = b;
  const optimization = STATS_OPTIMIZATION[statName];
  const multiplier = optimization === 'MAX' ? -1 : 1;
  return multiplier * (statsA[statName] - statsB[statName]);
};

const sortByStats = (reviewers, sortBy) => {
  const sortKey = SORT_KEY[sortBy] || SORT_KEY.REVIEWS;
  const sortFn = buildSort(sortKey);
  return reviewers.sort(sortFn);
};

module.exports = sortByStats;


/***/ }),

/***/ 7301:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

const { SORT_KEY, COLUMNS_ORDER } = __nccwpck_require__(8974);

const FIXED_COLUMNS = ['avatar', 'username'];

const hasValue = (str) => !!str;

const getColumnsOrder = (sortBy) => {
  const main = SORT_KEY[sortBy];
  const others = COLUMNS_ORDER.filter((c) => c !== main);
  return [...FIXED_COLUMNS, main, ...others].filter(hasValue);
};

const toArray = (columns) => (row) => columns.map((c) => row[c]);

module.exports = (tableData, sortBy) => {
  const columns = getColumnsOrder(sortBy);
  return tableData.map(toArray(columns));
};


/***/ }),

/***/ 4177:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

const { fetchPullRequestById } = __nccwpck_require__(5195);

const parsePullRequest = (data) => {
  const { node } = data;
  return {
    id: node.id,
    body: node.body,
  };
};

module.exports = async ({ octokit, pullRequestId }) => {
  const data = await fetchPullRequestById(octokit, pullRequestId);
  return parsePullRequest(data);
};


/***/ }),

/***/ 9674:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

const { fetchPullRequests } = __nccwpck_require__(5195);
const { parsePullRequest } = __nccwpck_require__(9484);

const filterNullAuthor = ({ node }) => !!node.author;

const ownerFilter = ({ org, repos }) => {
  if (org) return `org:${org}`;
  return (repos || []).map((r) => `repo:${r}`).join(' ');
};

const buildQuery = ({ org, repos, startDate }) => {
  const dateFilter = `created:>=${startDate.toISOString()}`;
  return `type:pr -review:none sort:author-date ${ownerFilter({ org, repos })} ${dateFilter}`;
};

const getPullRequests = async (params) => {
  const { limit } = params;
  const data = await fetchPullRequests(params);
  const results = data.search.edges
    .filter(filterNullAuthor)
    .map(parsePullRequest);

  if (results.length < limit) return results;

  const last = results[results.length - 1].cursor;
  return results.concat(await getPullRequests({ ...params, after: last }));
};

module.exports = ({
  octokit,
  org,
  repos,
  startDate,
  itemsPerPage = 100,
}) => {
  const search = buildQuery({ org, repos, startDate });
  return getPullRequests({ octokit, search, limit: itemsPerPage });
};


/***/ }),

/***/ 2484:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

const { sum, median, divide } = __nccwpck_require__(2070);

const getProperty = (list, prop) => list.map((el) => el[prop]);

module.exports = (reviews) => {
  const pullIds = getProperty(reviews, 'pullId');
  const totalReviews = new Set(pullIds).size;
  const totalComments = sum(getProperty(reviews, 'commentsCount'));

  return {
    totalReviews,
    totalComments,
    commentsPerReview: divide(totalComments, totalReviews),
    timeToReview: median(getProperty(reviews, 'timeToReview')),
  };
};


/***/ }),

/***/ 5046:
/***/ ((module) => {

module.exports = (pulls) => {
  const removeOwnPulls = ({ isOwnPull }) => !isOwnPull;

  const removeWithEmptyId = ({ id }) => !!id;

  const all = Object.values(pulls).reduce((acc, pull) => {
    const reviews = pull.reviews
      .filter(removeOwnPulls)
      .filter(removeWithEmptyId)
      .map((r) => ({ ...r, pullId: pull.id }));
    return acc.concat(reviews);
  }, []);

  const byAuthor = all.reduce((acc, review) => {
    const { author, isOwnPull, ...other } = review;
    const key = author.id;

    if (!acc[key]) acc[key] = { author, reviews: [] };

    acc[key].reviews.push(other);
    return acc;
  }, {});

  return Object.values(byAuthor);
};


/***/ }),

/***/ 1952:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

const calculateReviewsStats = __nccwpck_require__(2484);
const groupReviews = __nccwpck_require__(5046);

module.exports = (pulls) => groupReviews(pulls).map(({ author, reviews }) => {
  const stats = calculateReviewsStats(reviews);
  return { author, reviews, stats };
});


/***/ }),

/***/ 7896:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

const alreadyPublished = __nccwpck_require__(7397);
const buildTable = __nccwpck_require__(3463);
const buildComment = __nccwpck_require__(1869);
const getPullRequest = __nccwpck_require__(4177);
const getPulls = __nccwpck_require__(9674);
const getReviewers = __nccwpck_require__(1952);
const postComment = __nccwpck_require__(986);
const trackError = __nccwpck_require__(6736);
const trackRun = __nccwpck_require__(7341);
const trackSuccess = __nccwpck_require__(5613);

module.exports = {
  alreadyPublished,
  buildTable,
  buildComment,
  getPullRequest,
  getPulls,
  getReviewers,
  postComment,
  trackError,
  trackRun,
  trackSuccess,
};


/***/ }),

/***/ 986:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

const { updatePullRequest } = __nccwpck_require__(5195);
const core = __nccwpck_require__(7396);
const fs = __nccwpck_require__(5747);

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


/***/ }),

/***/ 6736:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

const { tracker } = __nccwpck_require__(2070);

module.exports = (error) => {
  const { message } = error || {};

  tracker.track('error', { message });
};


/***/ }),

/***/ 7341:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

const { tracker } = __nccwpck_require__(2070);

module.exports = ({
  org,
  repos,
  sortBy,
  periodLength,
  displayCharts,
  disableLinks,
  currentRepo,
  limit,
}) => {
  const [owner, repo] = currentRepo.split('/');
  const reposCount = (repos || []).length;
  const orgsCount = org ? 1 : 0;

  tracker.track('run', {
    repo,
    owner,
    currentRepo,
    sortBy,
    reposCount,
    orgsCount,
    periodLength,
    displayCharts,
    disableLinks,
    limit,
  });
};


/***/ }),

/***/ 5613:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

const { tracker } = __nccwpck_require__(2070);

module.exports = ({ executed, timeMs }) => {
  const timeSec = Math.floor(timeMs / 1000);
  const timeMin = Math.floor(timeMs / 60000);

  tracker.track('success', {
    timeMs,
    timeSec,
    timeMin,
    executed,
  });
};


/***/ }),

/***/ 9484:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

const parsePullRequest = __nccwpck_require__(1016);
const parseReview = __nccwpck_require__(9253);
const parseUser = __nccwpck_require__(2090);

module.exports = {
  parsePullRequest,
  parseReview,
  parseUser,
};


/***/ }),

/***/ 1016:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

const get = __nccwpck_require__(2565);
const parseUser = __nccwpck_require__(2090);
const parseReview = __nccwpck_require__(9253);

const filterNullAuthor = ({ author }) => !!author;

const getFilteredReviews = (data) => get(data, 'node.reviews.nodes', []).filter(filterNullAuthor);

module.exports = (data = {}) => {
  const author = parseUser(get(data, 'node.author'));
  const publishedAt = new Date(get(data, 'node.publishedAt'));
  const handleReviews = (review) => parseReview(review, { publishedAt, authorLogin: author.login });

  return {
    author,
    publishedAt,
    cursor: data.cursor,
    id: get(data, 'node.id'),
    reviews: getFilteredReviews(data).map(handleReviews),
  };
};


/***/ }),

/***/ 9253:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

const get = __nccwpck_require__(2565);
const parseUser = __nccwpck_require__(2090);

module.exports = (data = {}, pullRequest) => {
  const author = parseUser(data.author);
  const isOwnPull = author.login === pullRequest.authorLogin;
  const submittedAt = new Date(data.submittedAt);
  const commitDate = new Date(get(data, 'commit.pushedDate'));
  const startDate = Math.max(pullRequest.publishedAt, commitDate);

  return {
    author,
    isOwnPull,
    submittedAt,
    id: get(data, 'id'),
    commentsCount: get(data, 'comments.totalCount'),
    timeToReview: submittedAt - startDate,
  };
};


/***/ }),

/***/ 2090:
/***/ ((module) => {

module.exports = (data = {}) => ({
  id: data.databaseId,
  url: data.url,
  login: data.login,
  avatarUrl: data.avatarUrl,
});


/***/ }),

/***/ 3642:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

const sum = __nccwpck_require__(7199);
const divide = __nccwpck_require__(4173);

module.exports = (list) => divide(sum(list), list.length);


/***/ }),

/***/ 4173:
/***/ ((module) => {

module.exports = (numerator, denominator) => {
  if (!denominator) return null;
  return numerator / denominator;
};


/***/ }),

/***/ 9363:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

const humanizeDuration = __nccwpck_require__(2432);

const parser = humanizeDuration.humanizer({
  language: 'shortEn',
  languages: {
    shortEn: {
      y: () => 'y',
      mo: () => 'mo',
      w: () => 'w',
      d: () => 'd',
      h: () => 'h',
      m: () => 'm',
      s: () => 's',
      ms: () => 'ms',
    },
  },
});

module.exports = (value) => parser(value, {
  delimiter: ' ',
  spacer: '',
  units: ['d', 'h', 'm'],
  round: true,
});


/***/ }),

/***/ 2070:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

const average = __nccwpck_require__(3642);
const divide = __nccwpck_require__(4173);
const durationToString = __nccwpck_require__(9363);
const isNil = __nccwpck_require__(631);
const median = __nccwpck_require__(9463);
const subtractDaysToDate = __nccwpck_require__(3896);
const sum = __nccwpck_require__(7199);
const tracker = __nccwpck_require__(1261);

module.exports = {
  average,
  divide,
  durationToString,
  isNil,
  median,
  subtractDaysToDate,
  sum,
  tracker,
};


/***/ }),

/***/ 631:
/***/ ((module) => {

module.exports = (value) => value === null || value === undefined;


/***/ }),

/***/ 9463:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

const average = __nccwpck_require__(3642);

const intSort = (a, b) => a - b;

module.exports = (list) => {
  const sorted = (list || []).sort(intSort);
  const middle = Math.floor(sorted.length / 2);
  const isOdd = sorted.length % 2 !== 0;
  if (isOdd) return sorted[middle] || null;
  return average(sorted.slice(middle - 1, middle + 1));
};


/***/ }),

/***/ 3896:
/***/ ((module) => {

const DAY_IN_SEC = 24 * 60 * 60 * 1000;

module.exports = (date, days) => new Date(date.getTime() - days * DAY_IN_SEC);


/***/ }),

/***/ 7199:
/***/ ((module) => {

module.exports = (list) => (list || []).reduce((a, b) => a + b, 0);


/***/ }),

/***/ 1261:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

const Mixpanel = __nccwpck_require__(8515);
const project = __nccwpck_require__(306);

const MIXPANEL_TOKEN = '6a91c23a5c49e341a337954443e1f2a0';

const getContext = () => ({
  version: project.version,
});

const tracker = () => {
  const mixpanel = Mixpanel.init(MIXPANEL_TOKEN);
  const context = getContext();

  const track = (event, properties) => {
    mixpanel.track(event, {
      ...context,
      ...properties,
    });
  };

  return {
    track,
  };
};

module.exports = tracker();


/***/ }),

/***/ 7973:
/***/ ((module) => {

const VALID_EVENT_NAME = 'pull_request';

const validateEnv = (github) => {
  const { eventName } = github.context;
  if (eventName === VALID_EVENT_NAME) return;
  const error = `This action runs only in the "${VALID_EVENT_NAME}" event. Change the property "on" of your workflow file from "${eventName}" to "${VALID_EVENT_NAME}".`;
  throw new Error(error);
};

module.exports = {
  validateEnv,
};


/***/ }),

/***/ 7396:
/***/ ((module) => {

module.exports = eval("require")("@actions/core");


/***/ }),

/***/ 716:
/***/ ((module) => {

module.exports = eval("require")("@actions/github");


/***/ }),

/***/ 2432:
/***/ ((module) => {

module.exports = eval("require")("humanize-duration");


/***/ }),

/***/ 1409:
/***/ ((module) => {

module.exports = eval("require")("jsurl");


/***/ }),

/***/ 2565:
/***/ ((module) => {

module.exports = eval("require")("lodash.get");


/***/ }),

/***/ 7677:
/***/ ((module) => {

module.exports = eval("require")("markdown-table");


/***/ }),

/***/ 8515:
/***/ ((module) => {

module.exports = eval("require")("mixpanel");


/***/ }),

/***/ 306:
/***/ ((module) => {

"use strict";
module.exports = JSON.parse('{"name":"pull-request-stats","version":"2.1.1","description":"Github action to print relevant stats about Pull Request reviewers","main":"dist/index.js","scripts":{"build":"ncc build src/index.js","test":"yarn run build && jest"},"keywords":[],"author":"Manuel de la Torre","license":"agpl-3.0","jest":{"testEnvironment":"node","testMatch":["**/?(*.)+(spec|test).[jt]s?(x)"]},"dependencies":{"@actions/core":"^1.5.0","@actions/github":"^5.0.0","@vercel/ncc":"^0.30.0","humanize-duration":"^3.27.0","jsurl":"^0.1.5","lodash.get":"^4.4.2","markdown-table":"^2.0.0","mixpanel":"^0.13.0"},"devDependencies":{"@zeit/ncc":"^0.22.3","eslint":"^7.32.0","eslint-config-airbnb-base":"^14.2.1","eslint-plugin-import":"^2.24.1","eslint-plugin-jest":"^24.4.0","jest":"^27.0.6"}}');

/***/ }),

/***/ 5747:
/***/ ((module) => {

"use strict";
module.exports = require("fs");

/***/ })

/******/ 	});
/************************************************************************/
/******/ 	// The module cache
/******/ 	var __webpack_module_cache__ = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __nccwpck_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		var cachedModule = __webpack_module_cache__[moduleId];
/******/ 		if (cachedModule !== undefined) {
/******/ 			return cachedModule.exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = __webpack_module_cache__[moduleId] = {
/******/ 			// no module.id needed
/******/ 			// no module.loaded needed
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		var threw = true;
/******/ 		try {
/******/ 			__webpack_modules__[moduleId](module, module.exports, __nccwpck_require__);
/******/ 			threw = false;
/******/ 		} finally {
/******/ 			if(threw) delete __webpack_module_cache__[moduleId];
/******/ 		}
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/************************************************************************/
/******/ 	/* webpack/runtime/compat */
/******/ 	
/******/ 	if (typeof __nccwpck_require__ !== 'undefined') __nccwpck_require__.ab = __dirname + "/";
/******/ 	
/************************************************************************/
var __webpack_exports__ = {};
// This entry need to be wrapped in an IIFE because it need to be isolated against other modules in the chunk.
(() => {
const get = __nccwpck_require__(2565);
const core = __nccwpck_require__(7396);
const github = __nccwpck_require__(716);
const execute = __nccwpck_require__(9021);
const { validateEnv } = __nccwpck_require__(7973);

const parseBoolean = (value) => value === 'true';

const parseArray = (value) => value.split(',');

const getPeriod = () => {
  const MAX_PERIOD_DATE = 365;
  const value = parseInt(core.getInput('period'), 10);
  return Math.min(value, MAX_PERIOD_DATE);
};

const getRepositories = (currentRepo) => {
  const input = core.getInput('repositories');
  return input ? parseArray(input) : [currentRepo];
};

const getPrId = () => get(github, 'context.payload.pull_request.node_id');

const getParams = () => {
  const { payload } = github.context || {};
  const { repository } = payload || {};
  const currentRepo = repository.full_name;

  return {
    currentRepo,
    org: core.getInput('organization'),
    repos: getRepositories(currentRepo),
    sortBy: core.getInput('sort-by'),
    githubToken: core.getInput('token'),
    periodLength: getPeriod(),
    displayCharts: parseBoolean(core.getInput('charts')),
    disableLinks: parseBoolean(core.getInput('disable-links')),
    pullRequestId: getPrId(),
    limit: parseInt(core.getInput('limit'), 10),
  };
};

const run = async () => {
  try {
    validateEnv(github);
    await execute(getParams());
    core.info('Action successfully executed');
  } catch (error) {
    core.debug(`Execution failed with error: ${error.message}`);
    core.debug(error.stack);
    core.setFailed(error.message);
  }
};

run();

})();

module.exports = __webpack_exports__;
/******/ })()
;