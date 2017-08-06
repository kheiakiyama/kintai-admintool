const querystring = require('querystring')

class SlackParser {
  constructor(body) {
    this.body = body;
  }

  parse() {
    const body = decodeURIComponent(this.body);
    const replace = this._replaceImageUrl(body);
    return this._restoreImageUrl(querystring.parse(replace));
  }

  parseCommand() {
    const parsed = this.parse().text.split(" ");
    return {
      subcommand: parsed[0],
      args: parsed.slice(1)
    };
  }

  _restoreImageUrl(query) {
    if (this.imageUrl) {
      const re = /"dmy":""/;
      const matches = re.exec(query.payload);
      return { payload: query.payload.replace(re, this.imageUrl)};
    } else {
      return query;
    }
  }

  _replaceImageUrl(body) {
    const re = /"image_url":"(https)[^,]*"/;
    const matches = re.exec(body);
    if (matches) {
      this.imageUrl = matches[0];
      return body.replace(re, '"dmy":""');
    } else {
      this.imageUrl = false;
      return body;
    }
  }
}

module.exports = SlackParser;