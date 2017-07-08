var azureHelper = require('./azure-helper');
var azure = require('./slack-command/node_modules/azure-storage');

class TrainQueue {

  constructor(container) {
    this.blobSvc = azure.createBlobService();
    this.container = container;
  }

  //Queue の先頭にあるオブジェクトを削除し、返します。
  dequeue(objectFunc) {
    this._getLast(objectFunc, true);
  }

  //Queue の先頭にあるオブジェクトを削除せずに返します。
  peek(objectFunc) {
    this._getLast(objectFunc, false);
  }

  remove(object) {
    this.blobSvc.deleteBlob(this.container, object.name, (error, response) => {
      if (error) {
        console.log(error);
        return;
      }
      console.log(response);
    });
  }

  _getLast(objectFunc, remove) {
    this.blobSvc.createContainerIfNotExists(this.container, {publicAccessLevel : 'blob'}, (error, result, response) => {
      if (error) {
        console.log(error);
        return;
      }
      this.blobSvc.listBlobsSegmented(this.container, null, (error, result, response) => {
        if (error) {
          console.log(error);
          return;
        }
        console.log(result.entries.length);
        if (result.entries.length > 0) {
          objectFunc(result.entries[0]);
          if (remove) {
            this.remove(result.entries[0]);
          }
        }
      });
    });
  }
}

module.exports = TrainQueue;