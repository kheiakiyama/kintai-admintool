class TrainQueue {

  constructor(azure, container) {
    this.blobSvc = azure.createBlobService(process.env.KINTAI_STORAGE_CONNECTION);
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