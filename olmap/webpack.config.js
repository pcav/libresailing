const webpack = require('webpack');

module.exports = {
  entry: './main.js',
  output: {
    path: __dirname,
    filename: 'bundle.js'
  },
  devServer: {
    static: { 
      directory: path.resolve(__dirname, './assets'), 
      publicPath: '/assets'
    }
  }
};
