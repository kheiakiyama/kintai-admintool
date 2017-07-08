const url = require("url");
const path = require("path");

class TrainQueue {

  constructor(azure, container) {
    this.blobSvc = azure.createBlobService(process.env.KINTAI_STORAGE_CONNECTION);
    this.queueSvc = azure.createQueueService(process.env.KINTAI_STORAGE_CONNECTION);
    this.container = container;
  }

  //Queue の先頭にあるオブジェクトを削除せずに返します。
  peek(objectFunc, notFoundFunc) {
    this.blobSvc.listBlobsSegmented(this.container, null, (error, result, response) => {
      if (error) {
        console.log(error);
        return;
      }
      if (result.entries.length > 0) {
        objectFunc(result.entries[0]);
      } else {
        notFoundFunc();
      }
    });
  }

  remove(name) {
    this.blobSvc.deleteBlob(this.container, name, (error, response) => {
      if (error) {
        console.log(error);
        return;
      }
      console.log(response);
    });
  }

  setTagQueue(imageUrl, tag, success) {
    const message = JSON.stringify({
      imageUrl: imageUrl,
      tag: tag
    });
    this.queueSvc.createMessage('tag', message, (error, result, response) => {
      if(!error){
        success(result);
      }
    });
  }

  setTag(json) {
    const message = JSON.parse(json);
    //TODO: send to custom vision
    const parsed = url.parse(message.imageUrl);
    this.remove(path.basename(parsed.pathname));
  }
}

module.exports = TrainQueue;