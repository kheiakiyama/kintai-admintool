const KintaiMembers = require("../kintai-members");
const SlackParser = require("../slack-parser");

// You must include a context, but other arguments are optional
module.exports = (context, data) => {
  context.log('train-cognitive called');
  if (data.body) {
    const payload = new SlackParser(data.body).parse().payload;
    const members = new KintaiMembers();
    const selected = members.search(payload.actions[0].selected_options[0].value);
    context.res = {
        "text": "Who is him/her?",
        "response_type": "in_channel",
        "attachments": [
            {
                "text": selected.name + " choosed.",
                "fallback": "If you could read this message, you'd be choosing something fun to do right now.",
                "color": "#3AA3E3",
                "callback_id": "member_selection"
            }
        ]
    }
    context.done();
  }
};