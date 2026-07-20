const { ModuleFederationPlugin } = require('webpack').container;
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyPlugin = require('copy-webpack-plugin');
const path = require('path');

const DEV_PORT = 3001;
// In dev mode the remote is injected cross-origin from the spin-core host.
// publicPath: 'auto' relies on document.currentScript which is unreliable for
// async cross-origin scripts — webpack may resolve chunks against the host
// (localhost:3000) instead of the module server.  An explicit full URL fixes this.
// Production builds keep 'auto' so they work behind any proxy / CDN.
const isProduction = process.env.NODE_ENV === 'production';

module.exports = {
  mode: 'development',
  entry: './src/index.js',
  output: {
    path: path.resolve(__dirname, 'dist'),
    publicPath: isProduction ? 'auto' : `http://localhost:${DEV_PORT}/`,
    uniqueName: 'spinDocs',
    clean: true,
  },
  // React is provided by the spin-core host as window globals; mermaid is bundled locally.
  // Now that spin-docs uses React 19, bundled react/jsx-runtime is compatible with the host's
  // React 19 instance — no jsx-runtime externals needed.
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
