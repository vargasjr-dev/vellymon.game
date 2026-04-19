import all, { vellymonByUuid } from "../enums/vellymons";

const getVellymonModel = (uuid?: string) => {
  if (uuid) {
    const vellymonModel = vellymonByUuid.get(uuid);
    if (!vellymonModel) {
      throw new Error(`Could not find vellymon model ${uuid}`);
    }
    return vellymonModel;
  } else {
    // Random vellymon for testing
    const vellymonModel = all[Math.floor(Math.random() * all.length)];
    return vellymonModel;
  }
};

export default getVellymonModel;
