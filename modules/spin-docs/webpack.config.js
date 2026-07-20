const { ModuleFederationPlugin } = require('webpack').container;
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyPlugin = require('copy-webpack-plugin');
const path = require('path');

module.exports = {
  mode: 'development',
  entry: './src/index.js',
  output: {
    path: path.resolve(__dirname, 'dist'),
    publicPath: 'auto', // resolved at runtime — works behind any proxy
    uniqueName: 'spinDocs',
    clean: true,
  },
  // React is provided by the spin-core host as window globals; mermaid is bundled locally.
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
      {
        // mermaid ships its own CSS; bundle it into the JS chunk
        test: /\.css$/,
        use: ['style-loader', 'css-loader'],
      },
    ],
  },
  resolve: {
    extensions: ['.js', '.jsx'],
  },
  plugins: [
    new ModuleFederationPlugin({
      name: 'spinDocs',           // → window.spinDocs (scope in spin-core modules table)
      filename: 'remoteEntry.js',
      exposes: {
        './App': './src/App',     // → component: "./App" in spin-core
      },
    }),
    new HtmlWebpackPlugin({
      template: './public/index.html',
    }),
    new CopyPlugin({ patterns: [{ from: 'public/manifest.json', to: 'manifest.json' }] }),
  ],
  devServer: {
    port: 3001,
    headers: {
      'Access-Control-Allow-Origin': '*', // required for cross-origin federation loading
    },
  },
};
