const TrainQueue = require("../train-queue");
const azure = require('azure-storage');

// You must include a context, but other arguments are optional
module.exports = (context) => {
    context.log('train-tag-queue called');
    context.log(context.bindings.item);
    const queue = new TrainQueue(azure, process.env.KINTAI_STORAGE_CONTAINER);
    queue.setTag(context.bindings.item);
};