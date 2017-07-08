const KintaiMembers = require("../kintai-members");
const SlackParser = require("../slack-parser");
const TrainQueue = require("../train-queue");
const AzureHelper = require('../azure-helper');
const azure = require('azure-storage');

// You must include a context, but other arguments are optional
module.exports = (context, data) => {
  context.log('slack-command called');
  if (data.body) {
    const subcommand = new SlackParser(data.body).parse().text;
    if (subcommand === 'train') {
        const members = new KintaiMembers();
        const queue = new TrainQueue(azure, process.env.KINTAI_STORAGE_CONTAINER);
        queue.peek((object) => {
            const helper = new AzureHelper(azure);
            const token = helper.generateSasToken(process.env.KINTAI_STORAGE_CONTAINER, object.name, 'r');
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
                        "image_url": token.uri,
                        "thumb_url": token.uri,
                        "actions": [
                            {
                            "name": "members_list",
                            "text": "Pick a name...",
                            "type": "select",
                            "options": members.get_options()
                            }
                        ]
                    }
                ]
            }
            context.done();
        });
    } else {
        context.done();
    }
  } else {
      context.done();
  }
};