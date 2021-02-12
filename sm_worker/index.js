require('ignore-styles');

require('@babel/register')({
  ignore: [/(node_modules)/],
  presets: ['@babel/preset-env'],
  plugins: [
    [
      'module-resolver', {
        root: ['./src'],
      },
      // "@loadable/babel-plugin"
    ],
  ],
});

require('./server');
