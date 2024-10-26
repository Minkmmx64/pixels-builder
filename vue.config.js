const { defineConfig } = require("@vue/cli-service");

const NodePolyfillPlugin = require('node-polyfill-webpack-plugin') // 引入

module.exports = defineConfig({
  transpileDependencies: true,
  lintOnSave: false,
  configureWebpack: config => {
    config.plugins.push(new NodePolyfillPlugin())
  }
});
