var azure = require('./slack-command/node_modules/azure-storage');

class AzureHelper {

  constructor() {
  }

  // The following values can be used for permissions: 
  // "a" (Add), "r" (Read), "w" (Write), "d" (Delete), "l" (List)
  // Concatenate multiple permissions, such as "rwa" = Read, Write, Add
  generateSasToken(container, blobName, permissions) {
    var connString = process.env.AzureWebJobsStorage;
    var blobService = azure.createBlobService(connString);

    // Create a SAS token that expires in an hour
    // Set start time to five minutes ago to avoid clock skew.
    var startDate = new Date();
    startDate.setMinutes(startDate.getMinutes() - 5);
    var expiryDate = new Date(startDate);
    expiryDate.setMinutes(startDate.getMinutes() + 60);

    permissions = permissions || azure.BlobUtilities.SharedAccessPermissions.READ;

    var sharedAccessPolicy = {
        AccessPolicy: {
            Permissions: permissions,
            Start: startDate,
            Expiry: expiryDate
        }
    };
    
    var sasToken = blobService.generateSharedAccessSignature(container, blobName, sharedAccessPolicy);
    
    return {
        token: sasToken,
        uri: blobService.getUrl(container, blobName, sasToken, true)
    };
  }
}

module.exports = AzureHelper;