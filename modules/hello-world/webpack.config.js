const { ModuleFederationPlugin } = require('webpack').container;
const HtmlWebpackPlugin = require('html-webpack-plugin');
const path = require('path');

module.exports = {
  mode: 'development',
  entry: './src/index.js',
  output: {
    path: path.resolve(__dirname, 'dist'),
    publicPath: 'auto',
    uniqueName: 'helloWorld',
    clean: true,
  },
  // React is provided by the spin-core host via window.React / window.ReactDOM.
  // This prevents a second React copy from being bundled — one React instance = hooks work.
  // For standalone testing (localhost:3001), the UMD scripts in public/index.html set these globals.
  externals: {
    react: 'React',
    'react-dom': 'ReactDOM',
    'react-dom/client': 'ReactDOM',
  },
  module: {
    rules: [
      {
        test: /\.jsx?$/,
        use: 'babel-loader',
        exclude: /node_modules/,
      },
    ],
  },
  resolve: {
    extensions: ['.js', '.jsx'],
  },
  plugins: [
    new ModuleFederationPlugin({
      name: 'helloWorld',        // → window.helloWorld  (scope in spin-core)
      filename: 'remoteEntry.js',
      exposes: {
        './App': './src/App',    // → component: "./App" in spin-core
      },
    }),
    new HtmlWebpackPlugin({
      template: './public/index.html',
    }),
  ],
  devServer: {
    port: 3001,
    headers: {
      'Access-Control-Allow-Origin': '*',
    },
  },
};
