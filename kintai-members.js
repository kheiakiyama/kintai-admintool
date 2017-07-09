class KintaiMembers {

  constructor() {
    this.members = [
      {
        name: "Kohei Akiyama",
        id: "kheiakiyama"
      },
      {
        name: "Dummy",
        id: "dummy"
      },
      {
        name: "Unknown",
        id: null
      }
    ];
  }
  get_options() {
    return this.members.map((member) => {
      return { 
        text: member.name,
        value: member.id
      };
    });
  }
  search(id) {
    return this.members.find((element) => { return id === element.id });
  }
}

module.exports = KintaiMembers;