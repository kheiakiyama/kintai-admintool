const KintaiMembers = require("../kintai-members");
const SlackParser = require("../slack-parser");
const TrainQueue = require("../train-queue");
const azure = require('azure-storage');
const request = require('request');

// You must include a context, but other arguments are optional
module.exports = (context, data) => {
  context.log('slack-interactive called');
  if (data.body) {
    const payload = JSON.parse(new SlackParser(data.body).parse().payload);
    if (payload.callback_id === 'member_selection') {
        const queue = new TrainQueue(request, azure);
        queue.setTagQueue(
            payload.original_message.attachments[0].image_url,
            payload.actions[0].selected_options[0].value,
            () => {
                const selectedText = payload.original_message.attachments[0].actions.options.find((item) => {
                    return item.value === payload.actions[0].selected_options[0].value;
                }).text;
                var message = payload.original_message;
                context.log(message);
                message.attachments[0].text = selectedText + " choosed.";
                message.attachments[0].actions = '';
                context.res = message;
                context.done();
            }
        );
    } else {
        context.done();
    }
  }
};