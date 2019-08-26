module.exports = {
  root: true,
  env: {
    node: true
  },
  extends: [
    'plugin:vue/essential',
    '@vue/airbnb'
  ],
  rules: {
    'no-console': process.env.NODE_ENV === 'production' ? 'error' : 'off',
    'no-debugger': process.env.NODE_ENV === 'production' ? 'error' : 'off',

    // custom rules
    // don't require .vue extension when importing
    'import/extensions': ['error', 'always', {
      js: 'never',
      vue: 'never'
    }],
    
    'linebreak-style': 'off',
    'comma-dangle': ['error', 'never'],
    'max-len': 'off',
    'arrow-body-style': 'off',
    'arrow-parens': 'off',
    'lines-between-class-members': 'off',
    'no-param-reassign': 'off',
    'object-shorthand': ['error', 'properties'],
    'no-trailing-spaces': 'off',
    'no-undef': 'off',
    'new-cap': 'off',
    'no-return-assign': 'off',
    'no-plusplus': 'off',
    'no-multiple-empty-lines': 'off',
    'prefer-destructuring': 'off'
  },
  parserOptions: {
    parser: 'babel-eslint'
  }
};
