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
        if (objectFunc) {
          objectFunc(object);
        }
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
      this._createImage(message, () => {
        const parsed = url.parse(message.imageUrl);
        this._remove(path.basename(parsed.pathname, ".jpg"));
      });
    });
  }

  _getTagsCustomVision(endFunc) {
    this._trainRequest(
      'https://southcentralus.api.cognitive.microsoft.com/customvision/v1.0/Training/projects/' + process.env.CUSTOM_VISION_PROJECT_ID + '/tags',
      'GET',
      {},
      (error, response, body) => {
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

  _createImage(message, endFunc) {
    this._trainRequest(
      'https://southcentralus.api.cognitive.microsoft.com/customvision/v1.0/Training/projects/' + process.env.CUSTOM_VISION_PROJECT_ID + '/images/url',
      'POST',
      { "TagIds": [ this._getTagId(message.tag) ], "Urls": [ message.imageUrl ] },
      (error, response, body) => {
        if (error) {
          console.log(error);
          return;
        }
        console.log(body);
        if (endFunc) {
          endFunc();
        }
      }
    );
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

  _trainRequest(url, method, form, requestFunc) {
    const headers = {
      'Content-Type': 'application/json',
      'Training-key': process.env.CUSTOM_VISION_TRAINING_KEY
    }
    const options = {
      url: url,
      method: method,
      headers: headers,
      json: true,
      form: form
    }
    this.request(options, (error, response, body) => {
      requestFunc(error, response, body);
    });
  }

  train(endFunc) {
    this._trainRequest(
      'https://southcentralus.api.cognitive.microsoft.com/customvision/v1.0/Training/projects/' + process.env.CUSTOM_VISION_PROJECT_ID + '/train',
      'POST',
      {},
      (error, response, body) => {
        if (error) {
          console.log(error);
          return;
        }
        console.log(body);
        if (body.Code) {
          if (endFunc) {
            endFunc(body);
          }
          return;
        } else {
          setTimeout(() => {
            this._makeDefault(body, (body) => {
              if (endFunc) {
                endFunc(body);
              }
              this._getIterations((body) => {
                body
                  .filter((iteration) => { return iteration.Status === 'Completed' && !iteration.IsDefault; })
                  .forEach((iteration) => {
                    this._removeIteration(iteration);
                  });
              });
            });
          }, 10000)
        }
      }
    );
  }

  _makeDefault(iteration, endFunc) {
    iteration.IsDefault = true;
    this._trainRequest(
      'https://southcentralus.api.cognitive.microsoft.com/customvision/v1.0/Training/projects/' + process.env.CUSTOM_VISION_PROJECT_ID + '/iterations/' + iteration.Id,
      'PATCH',
      iteration,
      (error, response, body) => {
        if (error) {
          console.log(error);
          return;
        }
        console.log(body);
        if (endFunc) {
          endFunc(body);
        }
      }
    );
  }

  _getIterations(endFunc) {
    this._trainRequest(
      'https://southcentralus.api.cognitive.microsoft.com/customvision/v1.0/Training/projects/' + process.env.CUSTOM_VISION_PROJECT_ID + '/iterations',
      'GET',
      {},
      (error, response, body) => {
        if (error) {
          console.log(error);
          return;
        }
        console.log(body);
        if (endFunc) {
          endFunc(body);
        }
      }
    );
  }

  _removeIteration(iteration, endFunc) {
    this._trainRequest(
      'https://southcentralus.api.cognitive.microsoft.com/customvision/v1.0/Training/projects/' + process.env.CUSTOM_VISION_PROJECT_ID + '/iterations/' + iteration.Id,
      'DELETE',
      {},
      (error, response, body) => {
        if (error) {
          console.log(error);
          return;
        }
        console.log('deleted ' + iteration.Id);
        if (endFunc) {
          endFunc('deleted ' + iteration.Id);
        }
      }
    );
  }
}

module.exports = TrainQueue;