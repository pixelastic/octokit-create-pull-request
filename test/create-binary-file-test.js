const { test } = require("tap");
const { RequestError } = require("@octokit/request-error");

const { Octokit: Core } = require("@octokit/core");
const createPullRequest = require("..");
const Octokit = Core.plugin(createPullRequest);

test("happy path", async (t) => {
  const fixtures = require("./fixtures/create-binary-file");
  const fixturePr = fixtures[fixtures.length - 1].response;
  const octokit = new Octokit();

  octokit.hook.wrap("request", (_, options) => {
    const currentFixtures = fixtures.shift();
    const {
      baseUrl,
      method,
      url,
      request,
      headers,
      mediaType,
      ...params
    } = options;

    t.equal(currentFixtures.request.method, options.method);
    t.equal(currentFixtures.request.url, options.url);

    Object.keys(params).forEach((paramName) => {
      t.deepEqual(currentFixtures.request[paramName], params[paramName]);
    });

    if (currentFixtures.response.status >= 400) {
      throw new RequestError("Error", currentFixtures.response.status);
    }
    return currentFixtures.response;
  });

  const pr = await octokit.createPullRequest({
    owner: "gr2m",
    repo: "pull-request-test",
    title: "A black gif",
    body: "because",
    head: "patch",
    changes: {
      files: {
        "path/to/1x1-black.gif": {
          // https://css-tricks.com/snippets/html/base64-encode-of-1x1px-transparent-gif/
          content: "R0lGODlhAQABAIAAAAUEBAAAACwAAAAAAQABAAACAkQBADs=",
          encoding: "base64",
        },
      },
      commit: "why",
    },
  });

  t.deepEqual(pr, fixturePr);
  t.equal(fixtures.length, 0);
});
