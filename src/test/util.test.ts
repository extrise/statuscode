/**
 * Unit tests for the pure helpers in src/util.ts.
 * These run with the Node.js built-in test runner (no VS Code needed):
 *
 *   npm test
 *
 * @author Extrise
 * @license MIT
 */

import assert from "node:assert/strict"
import { describe, it } from "node:test"

import { LANGUAGE_ICONS } from "../constants.js"
import {
  extractRepoName,
  formatIssueText,
  formatTemplate,
  getFileName,
  getLanguageIcon,
  normalizeNumber,
  toGitHubHttpsUrl,
} from "../util.js"

describe("formatTemplate", () => {
  it("substitutes every variable", () => {
    assert.equal(
      formatTemplate("Editing {filename} in {workspace} ({language})", {
        filename: "index.ts",
        language: "TypeScript",
        workspace: "my-project",
      }),
      "Editing index.ts in my-project (TypeScript)",
    )
  })

  it("replaces repeated occurrences of the same variable", () => {
    assert.equal(
      formatTemplate("{workspace} :: {workspace}", {
        filename: "a.ts",
        language: "TypeScript",
        workspace: "repo",
      }),
      "repo :: repo",
    )
  })

  it("leaves unknown placeholders untouched", () => {
    assert.equal(
      formatTemplate("Hello {unknown}", {
        filename: "a.ts",
        language: "TypeScript",
        workspace: "repo",
      }),
      "Hello {unknown}",
    )
  })
})

describe("getFileName", () => {
  it("handles POSIX paths", () => {
    assert.equal(getFileName("/home/user/project/src/index.ts"), "index.ts")
  })

  it("handles Windows paths", () => {
    assert.equal(getFileName("C:\\Users\\user\\project\\main.py"), "main.py")
  })

  it("falls back for empty segments", () => {
    assert.equal(getFileName(""), "Unknown file")
  })
})

describe("extractRepoName", () => {
  it("parses HTTPS URLs", () => {
    assert.equal(extractRepoName("https://github.com/extrise/statuscode"), "extrise/statuscode")
  })

  it("parses SSH URLs", () => {
    assert.equal(extractRepoName("git@github.com:extrise/statuscode"), "extrise/statuscode")
  })

  it("falls back when the URL is not GitHub", () => {
    assert.equal(extractRepoName("https://gitlab.com/group/project"), "GitHub Repository")
  })
})

describe("toGitHubHttpsUrl", () => {
  it("converts SSH URLs", () => {
    assert.equal(toGitHubHttpsUrl("git@github.com:extrise/statuscode.git"), "https://github.com/extrise/statuscode")
  })

  it("converts ssh:// URLs", () => {
    assert.equal(
      toGitHubHttpsUrl("ssh://git@github.com/extrise/statuscode.git"),
      "https://github.com/extrise/statuscode",
    )
  })

  it("keeps HTTPS URLs and drops the .git suffix", () => {
    assert.equal(toGitHubHttpsUrl("https://github.com/extrise/statuscode.git"), "https://github.com/extrise/statuscode")
  })
})

describe("formatIssueText", () => {
  it("returns empty text when there are no issues", () => {
    assert.equal(formatIssueText({ errors: 0, warnings: 0 }), "")
  })

  it("formats errors and warnings", () => {
    assert.equal(formatIssueText({ errors: 2, warnings: 3 }), "(2 ❌, 3 ⚠️)")
  })

  it("formats warnings only", () => {
    assert.equal(formatIssueText({ errors: 0, warnings: 1 }), "(1 ⚠️)")
  })
})

describe("getLanguageIcon", () => {
  it("resolves known languages", () => {
    assert.deepEqual(getLanguageIcon("typescript"), { key: "typescript", text: "TypeScript" })
  })

  it("falls back to the text icon for unknown languages", () => {
    assert.deepEqual(getLanguageIcon("brainfuck"), { key: "text", text: "Brainfuck" })
  })

  it("has entries for the documented languages", () => {
    for (const languageId of ["javascript", "python", "go", "rust", "markdown"]) {
      assert.ok(LANGUAGE_ICONS[languageId], `missing icon for ${languageId}`)
    }
  })
})

describe("normalizeNumber", () => {
  it("falls back when the value is missing or NaN", () => {
    assert.equal(normalizeNumber(undefined, 5000, 1000), 5000)
    assert.equal(normalizeNumber(Number.NaN, 15000, 1000), 15000)
  })

  it("clamps values below the minimum", () => {
    assert.equal(normalizeNumber(10, 5000, 1000), 1000)
  })

  it("keeps valid values", () => {
    assert.equal(normalizeNumber(20000, 5000, 1000), 20000)
  })
})
