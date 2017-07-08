const querystring = require('querystring')

class SlackParser {
  constructor(body) {
    this.body = body;
  }

  parse(output) {
    const body = decodeURIComponent(this.body);
    if (output) {
      output(body);
    }
    const replace = this._replaceImageUrl(body);
    if (output) {
      output(replace);
    }
    if (output) {
      output(querystring.parse(replace));
    }
    return this._restoreImageUrl(querystring.parse(replace));
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