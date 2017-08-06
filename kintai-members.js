class KintaiMembers {

  constructor(azure) {
    this.azure = azure;
    this.tableName = 'members';
    this.members = null;
    this.tableSvc = azure.createTableService(process.env.KINTAI_STORAGE_CONNECTION);
    this.tableSvc.createTableIfNotExists(this.tableName, function(error, result, response){
      if(!error){
        // Table exists or created
      }
    });
  }
  get_options(success) {
    if (!this.members) {
      this.list(() => {
        success(this._get_options());
      });
    } else {
      success(this._get_options());
    }
  }

  _get_options() {
    return this.members.map((member) => {
      return { 
        text: member.name._,
        value: member.RowKey._
      };
    });
  }

  list(success) {
    var query = new this.azure.TableQuery()
      .where('PartitionKey eq ?', 'employee');
    this.tableSvc.queryEntities(this.tableName, query, null, (error, result, response) => {
      if(!error) {
        this.members = result.entries;
        if (success) {
          success(response);
        }
      }
    });
  }

  search(rowKey, success) {
    this.tableSvc.retrieveEntity(this.tableName, 'employee', rowKey, (error, result, response) => {
      if(!error && success){
        success(result);
      }
    });
  }
  add(member, success) {
    var entGen = this.azure.TableUtilities.entityGenerator;
    var newMember = {
      PartitionKey: entGen.String('employee'),
      RowKey: entGen.String(Math.random().toString(36).slice(-8)),
      name: entGen.String(member.name),
      id: entGen.String(member.id)
    };
    this.tableSvc.insertEntity(this.tableName, newMember, (error, result, response) => {
      if(!error && success){
        success(response);
      }
    });
  }

  remove(id, success) {
    var entGen = this.azure.TableUtilities.entityGenerator;
    var member = {
      PartitionKey: entGen.String('employee'),
      RowKey: entGen.String(id)
    };
    this.tableSvc.deleteEntity(this.tableName, member, (error, result, response) => {
      if(!error && success){
        success(response);
      }
    });
  }
}

module.exports = KintaiMembers;