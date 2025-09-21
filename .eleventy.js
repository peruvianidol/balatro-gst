module.exports = function(eleventyConfig) {
  
  eleventyConfig.addPassthroughCopy("_src/images");
  eleventyConfig.addPassthroughCopy("_src/css");
  eleventyConfig.addPassthroughCopy("_src/js");
  eleventyConfig.addPassthroughCopy("_src/sounds");

  return {
    // Preprocess HTML and Markdown with Nunjucks
    markdownTemplateEngine: 'njk',
    htmlTemplateEngine: 'njk',

    // Set input and output directories
    dir: {
      input: '_src',
      output: '_site'
    }
  };
};