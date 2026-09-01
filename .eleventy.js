const footnote = require("markdown-it-footnote");
const markdownIt = require("markdown-it");
const md = markdownIt({
  html: true,
  linkify: true,
  typographer: true,
  breaks: true
});
const hljs = require("highlight.js"); // For code block highlighting.

module.exports = function (eleventyConfig) {
  eleventyConfig.addPassthroughCopy({ "source/assets": "assets" });
  eleventyConfig.addPassthroughCopy({ "source/css": "css" });
  eleventyConfig.addPassthroughCopy({ "source/scripts": "scripts" });
  eleventyConfig.addPassthroughCopy({ "source/data": "data"});

  eleventyConfig.ignores.add("source/knowledge/**");

  eleventyConfig.addCollection("notebook", function(collectionApi) {
    return collectionApi.getFilteredByGlob("source/notebook/*.md");
  });

  eleventyConfig.amendLibrary("md", mdLib => {
    mdLib.use(footnote);

    // In-text footnote shows as superscript number without brackets
    mdLib.renderer.rules.footnote_ref = (tokens, idx, options, env, slf) => {
      const id = tokens[idx].meta.id + 1;
      return `<sup class="footnote-ref" id="fnref${id}"><a href="#fn${id}" rel="footnote">${id}</a></sup>`;
    };

    // Ensure bottom footnote block shows as numbered list
    mdLib.renderer.rules.footnote_block = (tokens, idx, options, env, slf) => {
      let html = '<hr class="footnotes-sep">\n<section class="footnotes">\n<ol class="footnotes-list">\n';
      for (let i = 0; i < tokens[idx].children.length; i++) {
        const token = tokens[idx].children[i];
        if (token.type === "footnote_open") {
          const id = token.meta.id + 1;
          html += `<li id="fn:${id}" class="footnote-item">`;
        } else if (token.type === "footnote_close") {
          html += "</li>\n";
        } else if (token.type === "inline") {
          html += slf.renderInline(token.children, options, env);
        }
      }
      html += "</ol>\n</section>";
      return html;
    };

    // Custom code block renderer using highlight.js
    mdLib.renderer.rules.fence = (tokens, idx) => {
      const token = tokens[idx];
      const lang  = (token.info || "").trim().toLowerCase();
      const source = token.content;

      let highlighted;
      if (lang && hljs.getLanguage(lang)) {
        highlighted = hljs.highlight(source, { language: lang }).value;
      } else {
        // Unknown or unspecified language — escape and render as plain text
        highlighted = hljs.highlightAuto(source).value;
      }

      const displayLang = lang || "text";

      return `<div class="highlight">` +
        `<pre class="hljs language-${displayLang}" data-language="${displayLang}" tabindex="0">` +
          `<code>${highlighted}</code>` +
        `<div class="code-title">${displayLang}<button class="copy-button">Copy</button></div>` +
        `</pre>` +
      `</div>\n`;
    };
  });

  eleventyConfig.addPairedShortcode("accordion", function(content, header) {
    return `<div class="accordion role-description">
        <button class="accordion-header" aria-expanded="false">
          ${header || ""}
        </button>
        <div class="accordion-panel">
          <div class="accordion-content">
            ${content}
          </div>
        </div>
      </div>`;
  });

  // Filter to properly format dates. Use like this: {{ page.date | formatDate("YYYY-MM-DD") }}
  eleventyConfig.addFilter("formatDate", function (value, format = "MMMM Do, YYYY") {
    if (!value) return '';

    let date;

    // Handle different input types
    if (typeof value === "string") {
      // Parse ISO string (handles the trailing Z = UTC)
      date = new Date(value);
    } else if (value instanceof Date) {
      date = value;
    } else {
      return "";
    }

    // Invalid date check
    if (isNaN(date.getTime())) return '';

    // Extract UTC components to avoid timezone shifts
    const year = date.getUTCFullYear();
    const monthIndex = date.getUTCMonth(); // 0-11
    const day = date.getUTCDate();

    // Month names (using toLocaleString for localization if needed later)
    const fullMonth = date.toLocaleString("en-US", { month: "long", timeZone: "UTC" });
    const shortMonth = date.toLocaleString("en-US", { month: "short", timeZone: "UTC" });

    // Ordinal suffix function
    function getOrdinalSuffix(n) {
      const s = ["th", "st", "nd", "rd"];
      const v = n % 100;
      return (s[(v - 20) % 10] || s[v] || s[0]);
    }

    // Token replacement map
    const tokens = {
      YYYY: year.toString(),
      YY: (year % 100).toString().padStart(2, '0'),
      MMMM: fullMonth,
      MMM: shortMonth,
      MM: (monthIndex + 1).toString().padStart(2, '0'),
      M: (monthIndex + 1).toString(),
      DD: day.toString().padStart(2, '0'),
      D: day.toString(),
      Do: day + getOrdinalSuffix(day)
    };

    // Replace tokens in the format string (longer tokens first to avoid partial matches)
    return format.replace(/YYYY|MMMM|MMM|Do|YY|DD|MM|M|D/g, match => tokens[match] || match);
  });

  return {
    dir: {
      input: "source",
      includes: "_includes",
      layouts: "_includes/layouts",
      output: "public",
    },
    passthroughFileCopy: true,
  };
};
