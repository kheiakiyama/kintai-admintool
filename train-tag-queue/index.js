const TrainQueue = require("../train-queue");
const azure = require('azure-storage');
const request = require('request');

// You must include a context, but other arguments are optional
module.exports = (context) => {
    context.log('train-tag-queue called');
    context.log(context.bindings.myQueueItem);
    const queue = new TrainQueue(request, azure);
    queue.addImage(context.bindings.myQueueItem);
};