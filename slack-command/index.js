const KintaiMembers = require("../kintai-members");
const SlackParser = require("../slack-parser");
const TrainQueue = require("../train-queue");
const AzureHelper = require('../azure-helper');
const azure = require('azure-storage');
const request = require('request');

// You must include a context, but other arguments are optional
module.exports = (context, data) => {
  context.log('slack-command called');
  if (data.body) {
    const subcommand = new SlackParser(data.body).parse().text;
    const queue = new TrainQueue(request, azure);
    const members = new KintaiMembers(azure);
    if (subcommand === 'status') {
        queue.getAllTags((text) => {
            context.res = {
                "text": text,
                "response_type": "in_channel",
            };
            context.done();
        })
    } else if (subcommand === 'list') {
        members.get_options((options) => {
            var text = "";
            options.forEach((element) => { text += element.text + ' ' + element.value + '\n'; });
            context.res = {
                "text": text,
                "response_type": "in_channel",
            };
            context.done();
        });
    } else if (subcommand === 'train') {
        members.get_options((options) => {
            queue.peek((object) => {
                const helper = new AzureHelper(azure);
                const token = helper.generateSasToken(process.env.KINTAI_STORAGE_CONTAINER, object.filename, 'r');
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
                                "options": options
                                }
                            ]
                        }
                    ]
                }
                context.done();
            }, () => {
                context.res = {
                    "text": "Not found image",
                    "response_type": "in_channel"
                };
                context.done();
            });
        });
    } else {
        context.done();
    }
  } else {
      context.done();
  }
};