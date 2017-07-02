const querystring = require('querystring')

class SlackParser {
  constructor(body) {
    this.body = body;
  }

  parse() {
    const body = decodeURIComponent(this.body);
    return querystring.parse(body);
  }
}

module.exports = SlackParser;