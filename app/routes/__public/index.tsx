import Landing, {
  Splash,
  Showcase,
} from "@dvargas92495/app/components/Landing";

export const handle = Landing.handle;

export default () => (
  <Landing>
    <Splash
      title={"Play and Earn through your army of robots"}
      subtitle={
        "Vellymon pits players against each other in a simultaneous action RPG"
      }
    />
    <Showcase header="Rule the arena through battle" showCards={[]} />
  </Landing>
);
