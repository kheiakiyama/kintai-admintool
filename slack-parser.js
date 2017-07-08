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

  _restoreImageUrl(query) {
    const re = /"dmy":""/;
    const matches = re.exec(query.payload);
    return { payload: query.payload.replace(re, this.imageUrl)};
  }

  _replaceImageUrl(body) {
    const re = /"image_url":"(https)[^,]*"/;
    const matches = re.exec(body);
    this.imageUrl = matches[0];
    return body.replace(re, '"dmy":""');
  }
}

module.exports = SlackParser;