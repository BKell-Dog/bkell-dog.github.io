module.exports = function (eleventyConfig) {
  eleventyConfig.addPassthroughCopy({ "source/assets": "assets" });
  eleventyConfig.addPassthroughCopy({ "source/css": "css" });
  eleventyConfig.addPassthroughCopy({ "source/scripts": "scripts" });
  eleventyConfig.addPassthroughCopy({ "source/data": "data"});

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
