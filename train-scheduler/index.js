const TrainQueue = require("../train-queue");
const azure = require('azure-storage');
const request = require('request');

// You must include a context, but other arguments are optional
module.exports = (context, myTimer) => {
    context.log('train-scheduler called');
    const queue = new TrainQueue(request, azure);
    queue.train((body) => {
        context.log(body);
        context.done();
    });
};