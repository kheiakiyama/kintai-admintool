class KintaiMembers {

  constructor() {
    this.members = [
      {
        name: "Kohei Akiyama",
        id: "kheiakiyama"
      },
      {
        name: "Unknown1",
        id: "member1"
      },
      {
        name: "Unknown2",
        id: "member2"
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