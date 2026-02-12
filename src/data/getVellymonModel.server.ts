import all from "../enums/vellymons";

const getVellymonModel = (uuid?: string) => {
  if (uuid) {
    const vellymonModel = all.find((a) => a.uuid === uuid);
    if (!vellymonModel) {
      throw new Error(`Could not find vellymon model ${uuid}`);
    }
    return vellymonModel;
  } else {
    const vellymonModel = all[Math.floor(Math.random() * all.length)];
    return vellymonModel;
  }
};

export default getVellymonModel;
