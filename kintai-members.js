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
  get_all() {
    return this.members;
  }
  search(id) {
    return this.members.find((element) => { return id === element.id });
  }
}

module.exports = KintaiMembers;