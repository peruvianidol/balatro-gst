module.exports = function(eleventyConfig) {
  
  eleventyConfig.addPassthroughCopy("_src/images");
  eleventyConfig.addPassthroughCopy("_src/css");

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