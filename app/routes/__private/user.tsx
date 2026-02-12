import React from "react";
import getMeta from "@dvargas92495/app/utils/getMeta";
import UserDashboard from "@dvargas92495/app/components/UserDashboard";
export { default as ErrorBoundary } from "@dvargas92495/app/components/DefaultErrorBoundary";
export { default as CatchBoundary } from "@dvargas92495/app/components/DefaultCatchBoundary";

const TABS = ["Teams", "Matches", "Settings"];

const UserPage: React.FunctionComponent = () => {
  return <UserDashboard tabs={TABS} title={"Vellymon"} />;
};

export const meta = getMeta({
  title: "User",
});

export default UserPage;
