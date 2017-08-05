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
        const members = new KintaiMembers(azure);
        members.search(payload.actions[0].selected_options[0].value, (selected) => {
            const queue = new TrainQueue(request, azure);
            queue.setTagQueue(
                payload.original_message.attachments[0].image_url,
                selected.name._,
                () => {
                    var message = payload.original_message;
                    context.log(message);
                    message.attachments[0].text = selected.name + " choosed.";
                    message.attachments[0].actions = '';
                    context.res = message;
                    context.done();
                }
            );
        });
    } else {
        context.done();
    }
  }
};