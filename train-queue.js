class TrainQueue {

  constructor(azure, container) {
    this.blobSvc = azure.createBlobService(process.env.KINTAI_STORAGE_CONNECTION);
    this.container = container;
  }

  //Queue の先頭にあるオブジェクトを削除せずに返します。
  peek(objectFunc) {
    this.blobSvc.listBlobsSegmented(this.container, null, (error, result, response) => {
      if (error) {
        console.log(error);
        return;
      }
      if (result.entries.length > 0) {
        objectFunc(result.entries[0]);
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
}

module.exports = TrainQueue;