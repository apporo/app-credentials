module.exports = {
  plugins: {
    appTokenify: {
      jwt: {
        tokenHeaderName: 'x-access-token',
        tokenQueryName: 'token',
        expiresIn: 86400,
        ignoreExpiration: false,
        password: 'sup3rs3cr3tp4ssw0rd'
      },
      protectedPaths: []
    }
  }
};
