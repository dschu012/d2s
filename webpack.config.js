module.exports = [{
  mode: 'production',
  entry: { 
    d2s: './src/index.ts',
    constants_96: './src/data/versions/96_constant_data.ts',
    constants_99: './src/data/versions/99_constant_data.ts'
  },
  plugins: [],
  output: {
    path: __dirname + '/dist',
    filename: '[name].bundle.min.js',
    library: '[name]'
  },
  resolve: {
    extensions: ['.ts', '.tsx', '.js']
  },
  module: {
    rules: [
      { test: /\.tsx?$/, loader: 'ts-loader' }
    ]
  }
},
{
  mode: 'development',
  entry: { 
    d2s: './src/index.ts',
    constants_96: './src/data/versions/96_constant_data.ts',
    constants_99: './src/data/versions/99_constant_data.ts'
  },
  devtool: 'source-map',
  plugins: [],
  output: {
    path: __dirname + '/dist',
    filename: '[name].bundle.js',
    library: '[name]'
  },
  resolve: {
    extensions: ['.ts', '.tsx', '.js']
  },
  module: {
    rules: [
      { test: /\.tsx?$/, loader: 'ts-loader' }
    ]
  }
}]