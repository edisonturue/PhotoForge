const path = require('path');

const mainConfig = {
  mode: 'development',
  devtool: 'source-map',
  entry: './src/main/main.ts',
  target: 'electron-main',
  output: {
    path: path.resolve(__dirname, 'dist/main'),
    filename: 'main.js',
  },
  resolve: {
    extensions: ['.ts', '.js'],
    alias: {
      '@main': path.resolve(__dirname, 'src/main'),
      '@renderer': path.resolve(__dirname, 'src/renderer'),
      '@shared': path.resolve(__dirname, 'src/shared'),
    },
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        use: {
          loader: 'ts-loader',
          options: {
            configFile: path.resolve(__dirname, 'tsconfig.main.json'),
          },
        },
        exclude: /node_modules/,
      },
    ],
  },
  node: {
    __dirname: false,
    __filename: false,
  },
  // Sharp uses native binaries - mark as external
  externals: {
    sharp: 'commonjs sharp',
  },
};

const preloadConfig = {
  mode: 'development',
  devtool: 'source-map',
  entry: './src/main/preload.ts',
  target: 'electron-preload',
  output: {
    path: path.resolve(__dirname, 'dist/main'),
    filename: 'preload.js',
  },
  resolve: {
    extensions: ['.ts', '.js'],
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        use: {
          loader: 'ts-loader',
          options: {
            configFile: path.resolve(__dirname, 'tsconfig.main.json'),
          },
        },
        exclude: /node_modules/,
      },
    ],
  },
};

module.exports = [mainConfig, preloadConfig];
