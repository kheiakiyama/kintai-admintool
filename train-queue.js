const url = require("url");
const path = require("path");
const MAX_IMAGE_PER_TAG = 20;

class TrainQueue {

  constructor(request, azure) {
    this.request = request;
    this.queueSvc = azure.createQueueService(process.env.KINTAI_STORAGE_CONNECTION);
    this.tags = [];
  }

  //Queue の先頭にあるオブジェクトを削除せずに返します。
  peek(objectFunc, notFoundFunc) {
    this.queueSvc.getMessages(process.env.KINTAI_QUEUE_NAME, { numofmessages: 1, peekonly: false }, (error, result, response) => {
      if (error) {
        console.log(error);
        return;
      }
      if (result.length > 0) {
        var object = result[0];
        Object.assign(object, { filename: object.messageId + '.jpg' });
        var meta = {
          messageId: object.messageId,
          popReceipt: object.popReceipt
        };
        this.queueSvc.setQueueMetadata(process.env.KINTAI_QUEUE_NAME, meta, {}, (error, result, response) => {
          if (error) {
            console.log(error);
            return;
          }
          console.log("setQueueMetadata");
          console.log(result);
          if (objectFunc) {
            objectFunc(object);
          }
        });
      } else {
        if (notFoundFunc) {
          notFoundFunc();
        }
      }
    });
  }

  _remove(messageId) {
    this.queueSvc.getQueueMetadata(process.env.KINTAI_QUEUE_NAME, {}, (error, result, response) => {
      if (error) {
        console.log(error);
        return;
      }
      console.log(result);
      if (result.metadata.messageId !== messageId) {
        console.log("unmatch messageId");
        return;
      }
      this.queueSvc.deleteMessage(process.env.KINTAI_QUEUE_NAME, messageId, result.metadata.popReceipt, (error, result, response) => {
        if (error) {
          console.log(error);
          return;
        }
        console.log(result);
      });
    });
  }

  setTagQueue(imageUrl, tag, success) {
    const message = new Buffer(JSON.stringify({
      imageUrl: imageUrl,
      tag: tag
    })).toString('base64');
    this.queueSvc.createMessage('tag', message, (error, result, response) => {
      if(!error){
        success(result);
      }
    });
  }

  setTag(message) {
    this._getTagsCustomVision(() => {
      if (this._isTagImageOver(message.tag)) {
        return;
      }
      this._trainCustomVision(message, () => {
        const parsed = url.parse(message.imageUrl);
        this._remove(path.basename(parsed.pathname, ".jpg"));
      });
    });
  }

  _getTagsCustomVision(endFunc) {
    const headers = {
      'Content-Type': 'application/json',
      'Training-key': process.env.CUSTOM_VISION_TRAINING_KEY
    }
    const options = {
      url: 'https://southcentralus.api.cognitive.microsoft.com/customvision/v1.0/Training/projects/' + process.env.CUSTOM_VISION_PROJECT_ID + '/tags',
      method: 'GET',
      headers: headers,
      json: true
    }
    this.request(options, (error, response, body) => {
      if (error) {
        console.log(error);
        return;
      }
      this.tags = body.Tags;
      if (endFunc) {
        endFunc();
      }
    });
  }

  _getTagId(tagName) {
    const tag = this.tags.find((element) => { return tagName === element.Name });
    return tag ? tag.Id : '';
  }

  _isTagImageOver(tagName) {
    const tag = this.tags.find((element) => { return tagName === element.Name });
    return tag ? tag.ImageCount >= MAX_IMAGE_PER_TAG : false;
  }

  _trainCustomVision(message, endFunc) {
    const headers = {
      'Content-Type': 'application/json',
      'Training-key': process.env.CUSTOM_VISION_TRAINING_KEY
    }
    const options = {
      url: 'https://southcentralus.api.cognitive.microsoft.com/customvision/v1.0/Training/projects/' + process.env.CUSTOM_VISION_PROJECT_ID + '/images/url',
      method: 'POST',
      headers: headers,
      json: true,
      form: { "TagIds": [ this._getTagId(message.tag) ], "Urls": [ message.imageUrl ] }
    }
    this.request(options, (error, response, body) => {
      if (error) {
        console.log(error);
        return;
      }
      console.log(body);
      if (endFunc) {
        endFunc();
      }
    });
  }

  predictionUrl(url, endFunc) {
    const headers = {
      'Content-Type': 'application/json',
      'Prediction-key': process.env.CUSTOM_VISION_PREDICTION_KEY
    }
    const options = {
      url: 'https://southcentralus.api.cognitive.microsoft.com/customvision/v1.0/Prediction/' + process.env.CUSTOM_VISION_PROJECT_ID + '/url',
      method: 'POST',
      headers: headers,
      json: true,
      form: { "Url": url }
    }
    this.request(options, (error, response, body) => {
      if (error) {
        console.log(error);
        return;
      }
      console.log(body);
      if (endFunc) {
        var tag, max = 0;
        body.Predictions.forEach((element) => { if (element.Probability > max) { max = element.Probability; tag = element.Tag; } });
        endFunc(tag);
      }
    });
  }
}

module.exports = TrainQueue;