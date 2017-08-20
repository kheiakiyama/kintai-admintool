const url = require("url");
const path = require("path");
const fs = require("fs");
const querystring = require('querystring');
const MAX_IMAGE_PER_TAG = 20;
const AzureHelper = require('./azure-helper');
const KintaiMembers = require('./kintai-members');

class TrainQueue {

  constructor(request, azure) {
    this.azure = azure;
    this.request = request;
    this.queueSvc = azure.createQueueService(process.env.KINTAI_STORAGE_CONNECTION);
    this.blobSvc = azure.createBlobService(process.env.KINTAI_STORAGE_CONNECTION);
    this.helper = new AzureHelper(azure);
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

  setTagQueue(imageUrl, id, success) {
    const message = new Buffer(JSON.stringify({
      imageUrl: imageUrl,
      id: id
    })).toString('base64');
    this.queueSvc.createMessage('tag', message, (error, result, response) => {
      if(!error){
        success(result);
      }
    });
  }

  addImage(message) {
    this._getTagsCustomVision(() => {
      const members = new KintaiMembers(azure);
      members.search(message.id, (selected) => {
        message.tag = selected.name._;
        if (this._isTagImageOver(message.tag)) {
          return;
        }
        this._createImage(message, () => {
          const parsed = url.parse(message.imageUrl);
          this._remove(path.basename(parsed.pathname, ".jpg"));
        });
      });
    });
  }

  addImageFile(message, fileName) {
    this._getTagsCustomVision(() => {
      if (this._isTagImageOver(message.tag)) {
        return;
      }
      this._createImageFromFile(message, fileName, () => {
      });
    });
  }

  callAddQuestion(IncomingWebhook, containerName, fullName) {
    const fileName = path.basename(fullName);
    this.blobSvc.createBlockBlobFromLocalFile(containerName, fileName, fullName, (error, result, response) => {
      if (error) {
        console.log(error);
        return;
      }
      const token = this.helper.generateSasToken(containerName, fileName, 'r');
      const members = new KintaiMembers(this.azure);
      members.get_options((options) => {
        const url = process.env.SLACK_WEBHOOK_URL || '';
        const webhook = new IncomingWebhook(url);
        webhook.send({
          "text": "Who is him/her?",
          "response_type": "in_channel",
          "attachments": [
            {
              "text": "Choose a name",
              "fallback": "If you could read this message, you'd be choosing something fun to do right now.",
              "color": "#3AA3E3",
              "attachment_type": "default",
              "callback_id": "member_selection",
              "image_url": token.uri,
              "thumb_url": token.uri,
              "actions": [
                {
                  "name": "members_list",
                  "text": "Pick a name...",
                  "type": "select",
                  "options": options
                }
              ]
            }
          ]
        });
      });
    });
  }

  getAllTags(endFunc) {
    this._getTagsCustomVision(() => {
      const url = process.env.SLACK_WEBHOOK_URL || '';
      var text = "";
      this.tags.forEach((element) => { text += element.Name + ' ' + element.ImageCount + '\n'; });
      if (endFunc) {
        endFunc(text);
      }
    });
  }

  _getTagsCustomVision(endFunc) {
    this._trainRequest(
      {
        url: 'https://southcentralus.api.cognitive.microsoft.com/customvision/v1.0/Training/projects/' + process.env.CUSTOM_VISION_PROJECT_ID + '/tags',
        method: 'GET'
      },
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
      {
        url: 'https://southcentralus.api.cognitive.microsoft.com/customvision/v1.0/Training/projects/' + process.env.CUSTOM_VISION_PROJECT_ID + '/images/url',
        method: 'POST',
        form: { "TagIds": [ this._getTagId(message.tag) ], "Urls": [ message.imageUrl ] }
      },
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

  _createImageFromFile(message, fileName, endFunc) {
    const url = 'https://southcentralus.api.cognitive.microsoft.com/customvision/v1.0/Training/projects/' + process.env.CUSTOM_VISION_PROJECT_ID + '/images/image?' +
      querystring.stringify({ "TagIds": [ this._getTagId(message.tag) ] });
    this._trainRequest(
      {
        url: url,
        method: 'POST',
        multipart: [
          { body: fs.createReadStream(fileName) }
        ],
        headers: {
          'Content-Type': 'multipart/form-data',
          'Training-key': process.env.CUSTOM_VISION_TRAINING_KEY
        }
      },
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

  _trainRequest(options, requestFunc) {
    const headers = {
      'Content-Type': 'application/json',
      'Training-key': process.env.CUSTOM_VISION_TRAINING_KEY
    }
    var reqOptions = {
      headers: headers,
      json: true
    };
    Object.assign(reqOptions, options);
    return this.request(reqOptions, (error, response, body) => {
      requestFunc(error, response, body);
    });
  }

  train(endFunc) {
    this._trainRequest(
      {
        url: 'https://southcentralus.api.cognitive.microsoft.com/customvision/v1.0/Training/projects/' + process.env.CUSTOM_VISION_PROJECT_ID + '/train',
        method: 'POST'
      },
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
      {
        url: 'https://southcentralus.api.cognitive.microsoft.com/customvision/v1.0/Training/projects/' + process.env.CUSTOM_VISION_PROJECT_ID + '/iterations/' + iteration.Id,
        method: 'PATCH',
        form: iteration
      },
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
      {
        url: 'https://southcentralus.api.cognitive.microsoft.com/customvision/v1.0/Training/projects/' + process.env.CUSTOM_VISION_PROJECT_ID + '/iterations',
        method: 'GET'
      },
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
      {
        url: 'https://southcentralus.api.cognitive.microsoft.com/customvision/v1.0/Training/projects/' + process.env.CUSTOM_VISION_PROJECT_ID + '/iterations/' + iteration.Id,
        method: 'DELETE'
      },
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