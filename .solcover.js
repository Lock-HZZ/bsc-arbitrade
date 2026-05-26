module.exports = {
  mocha: {
    enableTimeouts: false
  },
  skipFiles: [
    'mock/**',
    'interfaces/**',
  ],
  providerOptions: {
    default_balance_ether: 100000000
  },
  configureYulOptimizer: true
}; 