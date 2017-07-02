const KintaiMembers = require("../kintai-members");

// You must include a context, but other arguments are optional
module.exports = (context, data) => {
  context.log('slack-command called');
  context.log(data);
  const members = new KintaiMembers();
  context.res = {
    "text": "Who is him/her?",
    "response_type": "in_channel",
    "attachments": [
        {
            "text": "Choose a name",
            "fallback": "If you could read this message, you'd be choosing something fun to do right now.",
            "color": "#3AA3E3",
            "attachment_type": "default",
            "callback_id": "member_selection",
            "actions": [
                {
                  "name": "members_list",
                  "text": "Pick a name...",
                  "type": "select",
                  "options": members.get_all()
                }
            ]
        }
    ]
  }
  context.done();
};