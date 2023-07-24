import SideBar from "../SideBar";
import Head from "next/head";
import TopBar from "../TopBar";

export default function ({ children }) {
  return (
    <>
      <Head>
        <meta
          name="viewport"
          content="width=device-width,initial-scale=1,shrink-to-fit=no"
        />
      </Head>
      <div className="app-container">
        <TopBar />
        <SideBar />
        <div className="main-container">{children}</div>
      </div>
    </>
  );
}
