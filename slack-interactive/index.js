const KintaiMembers = require("../kintai-members");
const SlackParser = require("../slack-parser");
const url = require("url");
const path = require("path");
const TrainQueue = require("../train-queue");
const azure = require('azure-storage');

// You must include a context, but other arguments are optional
module.exports = (context, data) => {
  context.log('slack-interactive called');
  if (data.body) {
    const payload = JSON.parse(new SlackParser(data.body).parse().payload);
    if (payload.callback_id === 'member_selection') {
        const members = new KintaiMembers();
        const selected = members.search(payload.actions[0].selected_options[0].value);
        if (selected) {
            const blobImageUrl = payload.original_message.attachments[0].image_url;
            const parsed = url.parse(blobImageUrl);
            const queue = new TrainQueue(azure, process.env.KINTAI_STORAGE_CONTAINER);
            queue.remove(path.basename(parsed.pathname));
            var message = payload.original_message;
            message.attachments[0].text = selected.name + " choosed.";
            context.res = message;
        }
    }
    context.done();
  }
};